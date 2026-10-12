import { BrowserWindow, dialog } from 'electron'
import { getDb } from '../db'
import { addFolder, listFolders, removeFolder } from '../db/folders'
import { handle } from './handle'
import { scanState } from './scan-state'

export function registerFolderIpc(): void {
  handle('folders:list', () => listFolders(getDb()))

  // Abre el diálogo nativo de Windows para elegir una carpeta y la registra.
  // Devuelve null si el usuario cancela el diálogo.
  handle('folders:pick-and-add', async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: 'Elige una carpeta de música',
      properties: ['openDirectory']
    }
    const parent = BrowserWindow.fromWebContents(event.sender)
    const picked = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    if (picked.canceled || picked.filePaths.length === 0) return null
    return addFolder(getDb(), picked.filePaths[0])
  })

  handle('folders:remove', (_event, folderId: number) => {
    if (scanState.current?.folderId === folderId)
      throw new Error('Esa carpeta se está escaneando ahora mismo.')
    removeFolder(getDb(), folderId)
  })
}
