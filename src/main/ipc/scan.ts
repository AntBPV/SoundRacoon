import { getDb } from '../db'
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
      return await scanFolder(getDb(), folderId, {
        signal: controller.signal,
        force,
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) event.sender.send('scan:progress', progress)
        }
      })
    } finally {
      scanState.current = null
    }
  })

  handle('scan:cancel', () => {
    scanState.current?.controller.abort()
  })

  // Errores del último escaneo de UNA carpeta (la pantalla de escaneo los muestra al terminar).
  handle('scan:errors', (_event, folderId: number) =>
    getDb()
      .prepare('SELECT file_path, message FROM scan_errors WHERE folder_id = ? ORDER BY id')
      .all(folderId)
  )
}
