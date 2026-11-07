import { app } from 'electron'
import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type Database from 'better-sqlite3'

const execFileAsync = promisify(execFile)
const ACOUSTID_URL = 'https://api.acoustid.org/v2/lookup'
const FPCALC_TIMEOUT_MS = 30_000
const ACOUSTID_TIMEOUT_MS = 30_000

interface FpcalcOutput {
  duration: number
  fingerprint: string
}

export interface AcoustIdLookup {
  status: string
  results: unknown[]
  duration: number
  fingerprint: string
}

export interface AcoustIdQueueProgress {
  processed: number
  total: number
  currentFile: string | null
}

const ACOUSTID_REQUEST_INTERVAL_MS = 334

const wait = async (milliseconds: number, signal?: AbortSignal): Promise<boolean> => {
  if (signal?.aborted) return false
  return await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve(true)
    }, milliseconds)
    const onAbort = (): void => {
      clearTimeout(timer)
      resolve(false)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function getFpcalcPath(): string {
  return (
    process.env.FPCALC_PATH ??
    (app.isPackaged
      ? join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'fpcalc.exe')
      : join(app.getAppPath(), 'resources', 'fpcalc.exe'))
  )
}

async function calculateFingerprint(filePath: string): Promise<FpcalcOutput> {
  const fpcalcPath = getFpcalcPath()
  await access(fpcalcPath)

  const { stdout } = await execFileAsync(fpcalcPath, ['-json', filePath], {
    timeout: FPCALC_TIMEOUT_MS,
    maxBuffer: 1024 * 1024
  })

  let output: unknown
  try {
    output = JSON.parse(stdout)
  } catch {
    throw new Error('fpcalc devolvió una respuesta que no es JSON válido.')
  }

  if (
    typeof output !== 'object' ||
    output === null ||
    typeof (output as { duration?: unknown }).duration !== 'number' ||
    !Number.isFinite((output as { duration: number }).duration) ||
    typeof (output as { fingerprint?: unknown }).fingerprint !== 'string' ||
    (output as { fingerprint: string }).fingerprint.length === 0
  ) {
    throw new Error('fpcalc no devolvió duration y fingerprint válidos.')
  }

  return output as FpcalcOutput
}

function parseLookupResponse(
  response: unknown,
  duration: number,
  fingerprint: string
): AcoustIdLookup {
  if (
    typeof response !== 'object' ||
    response === null ||
    typeof (response as { status?: unknown }).status !== 'string'
  ) {
    throw new Error('AcoustID devolvió una respuesta con formato inválido.')
  }

  const status = (response as { status: string }).status
  if (status !== 'ok') {
    const error = (response as { error?: { message?: unknown } }).error
    const message = typeof error?.message === 'string' ? `: ${error.message}` : ''
    throw new Error(`AcoustID rechazó la consulta${message}.`)
  }

  if (!Array.isArray((response as { results?: unknown }).results)) {
    throw new Error('AcoustID devolvió una respuesta exitosa sin resultados válidos.')
  }

  return {
    status,
    results: (response as { results: unknown[] }).results,
    duration,
    fingerprint
  }
}

export async function lookupTrackWithAcoustId(filePath: string): Promise<AcoustIdLookup> {
  const apiKey = process.env.ACOUSTID_API_KEY
  if (!apiKey) {
    throw new Error('Falta configurar la variable de entorno ACOUSTID_API_KEY.')
  }
  if (!filePath.trim()) {
    throw new Error('La ruta de la pista no puede estar vacía.')
  }

  const { duration, fingerprint } = await calculateFingerprint(filePath)
  const params = new URLSearchParams({
    client: apiKey,
    meta: 'recordings+releases',
    duration: String(Math.round(duration)),
    fingerprint
  })
  const response = await fetch(`${ACOUSTID_URL}?${params}`, {
    signal: AbortSignal.timeout(ACOUSTID_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`AcoustID respondió con HTTP ${response.status}.`)
  }

  return parseLookupResponse(await response.json(), duration, fingerprint)
}

export async function identifyUntaggedTracks(
  db: Database.Database,
  folderId: number,
  options: {
    signal?: AbortSignal
    onProgress?: (progress: AcoustIdQueueProgress) => void
  } = {}
): Promise<void> {
  const files = db
    .prepare('SELECT file_path FROM tracks WHERE folder_id = ? AND has_tags = 0 ORDER BY id')
    .all(folderId) as { file_path: string }[]

  let lastRequestAt = 0
  for (let index = 0; index < files.length; index++) {
    if (options.signal?.aborted) return

    const filePath = files[index].file_path
    const delay = Math.max(0, ACOUSTID_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt))
    if (!(await wait(delay, options.signal))) return

    options.onProgress?.({
      processed: index,
      total: files.length,
      currentFile: filePath
    })
    lastRequestAt = Date.now()

    try {
      const lookup = await lookupTrackWithAcoustId(filePath)
      console.log(`[acoustid] Consulta automática exitosa para ${filePath}:`, lookup)
    } catch (error) {
      console.error(
        `[acoustid] Consulta automática fallida para ${filePath}:`,
        error instanceof Error ? error.message : error
      )
    }
  }

  options.onProgress?.({
    processed: files.length,
    total: files.length,
    currentFile: null
  })
}
