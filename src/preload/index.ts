import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// API que la interfaz puede usar. Los tipos de cada función viven en index.d.ts:
// allí está el "contrato" que ve el renderer.
const api = {
  listFolders: () => ipcRenderer.invoke('folders:list'),
  pickAndAddFolder: () => ipcRenderer.invoke('folders:pick-and-add'),
  removeFolder: (folderId: number) => ipcRenderer.invoke('folders:remove', folderId),
  startScan: (folderId: number) => ipcRenderer.invoke('scan:start', folderId),
  cancelScan: () => ipcRenderer.invoke('scan:cancel'),
  getScanErrors: (folderId: number) => ipcRenderer.invoke('scan:errors', folderId),
  getLibraryStats: () => ipcRenderer.invoke('library:stats'),

  /** Suscribe a los avisos de progreso. Devuelve la función para cancelar la suscripción. */
  onScanProgress: (callback: (progress: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: unknown): void => callback(progress)
    ipcRenderer.on('scan:progress', listener)
    return () => {
      ipcRenderer.removeListener('scan:progress', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}