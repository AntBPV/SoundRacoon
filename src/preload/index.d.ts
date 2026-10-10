import { ElectronAPI } from '@electron-toolkit/preload'

/**
 * Contrato entre el proceso principal y la interfaz.
 * Los tipos van dentro de `declare global` para que el renderer los use sin importarlos.
 */
declare global {
  type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

  interface FolderRow {
    id: number
    path: string
    added_at: string
    last_scan_at: string | null
  }

  interface ScanProgress {
    phase: 'discovering' | 'reading'
    processed: number
    total: number
    currentFile: string | null
  }

  interface ScanResult {
    folderId: number
    added: number
    updated: number
    unchanged: number
    removed: number
    errors: number
    cancelled: boolean
  }

  interface ScanErrorRow {
    file_path: string
    message: string
  }

  interface LibraryStats {
    tracks: number
    albums: number
    artists: number
    tracksWithoutTags: number
    scanErrors: number
  }

  interface CatalogarApi {
    listFolders: () => Promise<IpcResult<FolderRow[]>>
    /** data es null si el usuario cierra el diálogo sin elegir nada. */
    pickAndAddFolder: () => Promise<IpcResult<FolderRow | null>>
    removeFolder: (folderId: number) => Promise<IpcResult<void>>
    startScan: (folderId: number) => Promise<IpcResult<ScanResult>>
    cancelScan: () => Promise<IpcResult<void>>
    getScanErrors: (folderId: number) => Promise<IpcResult<ScanErrorRow[]>>
    getLibraryStats: () => Promise<IpcResult<LibraryStats>>
    onScanProgress: (callback: (progress: ScanProgress) => void) => () => void
  }

  interface Window {
    electron: ElectronAPI
    api: CatalogarApi
  }
}