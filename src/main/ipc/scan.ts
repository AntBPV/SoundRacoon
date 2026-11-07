import { getDb } from '../db'
import { identifyUntaggedTracks, writeAcoustIdMetadata, type AcoustIdCandidate } from '../acoustid'
import { scanFolder } from '../scanner/scanner'
import { handle } from './handle'
import { scanState } from './scan-state'

export function registerScanIpc(): void {
  handle('scan:start', async (event, arg: { folderId: number; force: boolean }) => {
    const { folderId, force } = arg
    if (scanState.current) throw new Error('Ya hay un escaneo en curso.')
    const controller = new AbortController()
    scanState.current = { folderId, controller }
    try {
      const result = await scanFolder(getDb(), folderId, {
        signal: controller.signal,
        force,
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) event.sender.send('scan:progress', progress)
        }
      })
      let acoustIdCandidates: AcoustIdCandidate[] = []
      if (!result.cancelled) {
        acoustIdCandidates = await identifyUntaggedTracks(getDb(), folderId, {
          signal: controller.signal,
          onProgress: (progress) => {
            if (!event.sender.isDestroyed()) {
              event.sender.send('scan:progress', { phase: 'identifying', ...progress })
            }
          }
        })
      }
      if (controller.signal.aborted) result.cancelled = true
      return { ...result, acoustIdCandidates }
    } finally {
      scanState.current = null
    }
  })

  handle('scan:cancel', () => {
    scanState.current?.controller.abort()
  })

  handle(
    'acoustid:write',
    async (_event, arg: { folderId: number | null; candidates: AcoustIdCandidate[] }) => {
      const result = writeAcoustIdMetadata(arg.candidates)
      if (result.written > 0 && arg.folderId !== null) {
        await scanFolder(getDb(), arg.folderId, { force: true })
      }
      return result
    }
  )

  // Errores del último escaneo de UNA carpeta (la pantalla de escaneo los muestra al terminar).
  handle('scan:errors', (_event, folderId: number) =>
    getDb()
      .prepare('SELECT file_path, message FROM scan_errors WHERE folder_id = ? ORDER BY id')
      .all(folderId)
  )
}
