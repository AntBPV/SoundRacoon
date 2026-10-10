import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { getDb } from './db'
import { addFolder, listFolders, removeFolder } from './db/folders'
import { scanFolder } from './scanner/scanner'


/** Escaneo en curso (solo se permite uno a la vez). */
let currentScan: { folderId: number; controller: AbortController } | null = null

/**
 * Registra un canal IPC. Todo canal responde { ok: true, data } o { ok: false, error },
 * así la interfaz recibe mensajes de error limpios en vez de excepciones de Electron.
 */
function handle<A, R>(channel: string, fn: (event: IpcMainInvokeEvent, arg: A) => R | Promise<R>): void {
  ipcMain.handle(channel, async (event, arg: A) => {
    try {
      return { ok: true, data: await fn(event, arg) }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}

export function registerIpc(): void {
  handle('folders:list', () => listFolders(getDb()))

  // Abre el diálogo nativo de Windows para elegir una carpeta y la registra.
  // Devuelve null si el usuario cancela el diálogo.
  handle('folders:pick-and-add', async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: 'Elige una carpeta de música',
      properties: ['openDirectory']
    }
    const parent = BrowserWindow.fromWebContents(event.sender)
    const picked = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
    if (picked.canceled || picked.filePaths.length === 0) return null
    return addFolder(getDb(), picked.filePaths[0])
  })

  handle('folders:remove', (_event, folderId: number) => {
    if (currentScan?.folderId === folderId) throw new Error('Esa carpeta se está escaneando ahora mismo.')
    removeFolder(getDb(), folderId)
  })

  handle('scan:start', async (event, folderId: number) => {
    if (currentScan) throw new Error('Ya hay un escaneo en curso.')
    const controller = new AbortController()
    currentScan = { folderId, controller }
    try {
      return await scanFolder(getDb(), folderId, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) event.sender.send('scan:progress', progress)
        }
      })
    } finally {
      currentScan = null
    }
  })

  handle('scan:cancel', () => {
    currentScan?.controller.abort()
  })

  handle('scan:errors', (_event, folderId: number) =>
    getDb()
      .prepare('SELECT file_path, message FROM scan_errors WHERE folder_id = ? ORDER BY id')
      .all(folderId)
  )

  handle('library:stats', () =>
    getDb()
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM tracks)                     AS tracks,
           (SELECT COUNT(*) FROM albums)                     AS albums,
           (SELECT COUNT(*) FROM artists)                    AS artists,
           (SELECT COUNT(*) FROM tracks WHERE has_tags = 0)  AS tracksWithoutTags,
           (SELECT COUNT(*) FROM scan_errors)                AS scanErrors`
      )
      .get()
  )
}