import { app } from 'electron'
import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { promisify } from 'node:util'
import type Database from 'better-sqlite3'
import { File } from 'node-taglib-sharp'

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
  candidate: AcoustIdCandidate | null
}

export interface AcoustIdCandidate {
  filePath: string
  score: number
  title: string | null
  artist: string | null
  album: string | null
  track: number | null
  trackCount: number | null
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
    fingerprint,
    candidate: null
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
    // URLSearchParams convierte el espacio en `+`, formato esperado por AcoustID.
    meta: 'recordings releases',
    duration: String(Math.round(duration)),
    fingerprint
  })
  const response = await fetch(`${ACOUSTID_URL}?${params}`, {
    signal: AbortSignal.timeout(ACOUSTID_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`AcoustID respondió con HTTP ${response.status}.`)
  }

  const lookup = parseLookupResponse(await response.json(), duration, fingerprint)
  lookup.candidate = getBestCandidate(lookup, filePath)
  return lookup
}

function getBestCandidate(lookup: AcoustIdLookup, filePath: string): AcoustIdCandidate | null {
  const fileTitle = normalizeTitle(basename(filePath, extname(filePath)))
  const candidates: { candidate: AcoustIdCandidate; selectionScore: number }[] = []
  for (const result of lookup.results) {
    if (typeof result !== 'object' || result === null) continue
    const resultData = result as { score?: unknown; recordings?: unknown }
    const score =
      typeof resultData.score === 'number'
        ? resultData.score
        : typeof resultData.score === 'string'
          ? Number(resultData.score)
          : Number.NaN
    const recordings = Array.isArray(resultData.recordings)
      ? resultData.recordings
      : typeof resultData.recordings === 'object' && resultData.recordings !== null
        ? [resultData.recordings]
        : []
    if (!Number.isFinite(score) || recordings.length === 0) {
      console.warn('[acoustid] Resultado descartado:', {
        keys: Object.keys(result),
        score: resultData.score,
        recordingsType: Array.isArray(resultData.recordings)
          ? 'array'
          : typeof resultData.recordings
      })
      continue
    }
    for (const recording of recordings) {
      if (typeof recording !== 'object' || recording === null) continue
      const recordingData = recording as {
        title?: unknown
        artists?: unknown
        releases?: unknown
        duration?: unknown
      }
      const release = Array.isArray(recordingData.releases)
        ? recordingData.releases.find((item) => typeof item === 'object' && item !== null)
        : null
      const releaseData =
        typeof release === 'object' && release !== null
          ? (release as { title?: unknown; track_count?: unknown; artists?: unknown })
          : null
      const artistItems =
        Array.isArray(recordingData.artists) && recordingData.artists.length > 0
          ? recordingData.artists
          : releaseData?.artists
      const artists = Array.isArray(artistItems)
        ? artistItems
            .filter(
              (artist): artist is { name: string } =>
                typeof artist === 'object' &&
                artist !== null &&
                typeof (artist as { name?: unknown }).name === 'string'
            )
            .map((artist) => artist.name)
        : []

      const title = typeof recordingData.title === 'string' ? recordingData.title : null
      const titleSimilarity = title ? getTitleSimilarity(fileTitle, normalizeTitle(title)) : 0
      const recordingDuration =
        typeof recordingData.duration === 'number' ? recordingData.duration : null
      const durationSimilarity =
        recordingDuration === null
          ? 0
          : Math.max(0, 1 - Math.abs(recordingDuration - lookup.duration) / 10)

      candidates.push({
        candidate: {
          filePath,
          score,
          title,
          artist: artists.length > 0 ? artists.join(', ') : null,
          album: releaseData && typeof releaseData.title === 'string' ? releaseData.title : null,
          track: null,
          trackCount:
            releaseData && typeof releaseData.track_count === 'number'
              ? releaseData.track_count
              : null
        },
        // AcoustID scores results, not recordings. These additional signals select
        // the recording that best matches this specific file within each result.
        selectionScore: score + titleSimilarity * 0.2 + durationSimilarity * 0.1
      })
    }
  }

  const candidate =
    candidates.sort((left, right) => right.selectionScore - left.selectionScore)[0]?.candidate ??
    null
  console.log('[acoustid] Candidato seleccionado:', {
    resultCount: lookup.results.length,
    candidateCount: candidates.length,
    candidate
  })
  return candidate
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/official\s+(video|audio|music\s+video)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getTitleSimilarity(fileTitle: string, recordingTitle: string): number {
  const fileWords = new Set(fileTitle.split(/\s+/).filter((word) => word.length > 2))
  const recordingWords = recordingTitle.split(/\s+/).filter((word) => word.length > 2)
  if (fileWords.size === 0 || recordingWords.length === 0) return 0
  const matches = recordingWords.filter((word) => fileWords.has(word)).length
  return matches / recordingWords.length
}

export async function identifyUntaggedTracks(
  db: Database.Database,
  folderId: number,
  options: {
    signal?: AbortSignal
    onProgress?: (progress: AcoustIdQueueProgress) => void
  } = {}
): Promise<AcoustIdCandidate[]> {
  const files = db
    .prepare('SELECT file_path FROM tracks WHERE folder_id = ? AND has_tags = 0 ORDER BY id')
    .all(folderId) as { file_path: string }[]

  const candidates: AcoustIdCandidate[] = []
  let lastRequestAt = 0
  for (let index = 0; index < files.length; index++) {
    if (options.signal?.aborted) return candidates

    const filePath = files[index].file_path
    const delay = Math.max(0, ACOUSTID_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt))
    if (!(await wait(delay, options.signal))) return candidates

    options.onProgress?.({
      processed: index,
      total: files.length,
      currentFile: filePath
    })
    lastRequestAt = Date.now()

    try {
      const lookup = await lookupTrackWithAcoustId(filePath)
      const candidate = lookup.candidate
      if (candidate) candidates.push(candidate)
      console.log(`[acoustid] Consulta automática exitosa para ${filePath}:`, {
        resultCount: lookup.results.length,
        candidate
      })
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
  return candidates
}

export interface AcoustIdWriteResult {
  written: number
  errors: { filePath: string; message: string }[]
}

export function writeAcoustIdMetadata(candidates: AcoustIdCandidate[]): AcoustIdWriteResult {
  const result: AcoustIdWriteResult = { written: 0, errors: [] }
  for (const candidate of candidates) {
    try {
      const file = File.createFromPath(candidate.filePath)
      try {
        if (candidate.title) file.tag.title = candidate.title
        if (candidate.album) file.tag.album = candidate.album
        if (candidate.artist) {
          const artists = candidate.artist.split(',').map((artist) => artist.trim())
          file.tag.performers = artists
          file.tag.albumArtists = artists
        }
        if (candidate.track !== null) file.tag.track = candidate.track
        if (candidate.trackCount !== null) file.tag.trackCount = candidate.trackCount
        file.save()
        result.written++
      } finally {
        file.dispose()
      }
    } catch (error) {
      result.errors.push({
        filePath: candidate.filePath,
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }
  return result
}
