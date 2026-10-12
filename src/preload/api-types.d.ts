/**
 * Contrato entre el proceso principal y la interfaz: los tipos de todo lo que viaja por IPC.
 *
 * Es un archivo "ambiental" (sin import/export), así que sus tipos son globales y los ven
 * tanto el proceso principal como la interfaz sin importarlos. Vive en un archivo aparte de
 * index.d.ts porque TypeScript descarta un index.d.ts que convive con un index.ts, y
 * entonces el proceso principal no vería estos tipos.
 */

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

type TrackFilter = 'all' | 'untagged'
type TrackSortKey = 'title' | 'artist' | 'album' | 'year' | 'duration' | 'format' | 'path'

/** Consulta de la lista de pistas. La búsqueda, el filtro y el orden los resuelve SQLite. */
interface TrackQuery {
  search: string
  filter: TrackFilter
  sortBy: TrackSortKey
  sortDir: 'asc' | 'desc'
  offset: number
  limit: number
}

interface TrackRow {
  id: number
  filePath: string
  title: string | null
  artist: string | null
  album: string | null
  trackNo: number | null
  discNo: number | null
  year: number | null
  durationSec: number | null
  codec: string | null
  lossless: boolean | null
  bitDepth: number | null
  sampleRate: number | null
  bitrate: number | null
  hasCover: boolean
  hasTags: boolean
}

/** Una página de resultados, más el total de pistas que cumplen la consulta. */
interface TrackPage {
  total: number
  rows: TrackRow[]
}

/** Archivo que no se pudo leer en el último escaneo de su carpeta. */
interface LibraryErrorRow {
  id: number
  filePath: string
  message: string
  occurredAt: string
  folderPath: string | null
}

interface LibraryErrors {
  /** Total de errores registrados (rows puede traer menos si son muchísimos). */
  total: number
  rows: LibraryErrorRow[]
}

interface CatalogarApi {
  listFolders: () => Promise<IpcResult<FolderRow[]>>
  /** data es null si el usuario cierra el diálogo sin elegir nada. */
  pickAndAddFolder: () => Promise<IpcResult<FolderRow | null>>
  removeFolder: (folderId: number) => Promise<IpcResult<void>>
  /** force = true relee todos los archivos aunque no hayan cambiado. */
  startScan: (folderId: number, options?: { force?: boolean }) => Promise<IpcResult<ScanResult>>
  cancelScan: () => Promise<IpcResult<void>>
  getScanErrors: (folderId: number) => Promise<IpcResult<ScanErrorRow[]>>
  getLibraryStats: () => Promise<IpcResult<LibraryStats>>
  getTracks: (query: TrackQuery) => Promise<IpcResult<TrackPage>>
  /** Todos los archivos con error de todas las carpetas, sin importar cuándo se escanearon. */
  getAllScanErrors: () => Promise<IpcResult<LibraryErrors>>
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void
}
