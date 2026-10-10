import type Database from 'better-sqlite3'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { pruneOrphans } from '../db/folders'
import { isAudioFile } from './formats'
import { extractMetadata, type ExtractedTrack } from './metadata'

export interface ScanProgress {
  phase: 'discovering' | 'reading'
  processed: number
  total: number
  currentFile: string | null
}

export interface ScanResult {
  folderId: number
  added: number
  updated: number
  unchanged: number
  removed: number
  errors: number
  cancelled: boolean
}

export interface ScanOptions {
  onProgress?: (progress: ScanProgress) => void
  /** Para cancelar: el escaneo termina limpiamente y el índice queda consistente. */
  signal?: AbortSignal
}

interface DiscoveredFile {
  path: string
  size: number
  mtimeMs: number
}

interface ExistingTrack {
  id: number
  size: number
  mtimeMs: number
}

interface PendingWrite {
  file: DiscoveredFile
  meta: ExtractedTrack
  existingId: number | null
}

const BATCH_SIZE = 100 // pistas por transacción: escribir de a una sería lentísimo
const PROGRESS_EVERY = 10 // cada cuántos archivos se avisa a la interfaz

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))

/**
 * Recorre `root` y devuelve todos los archivos de audio con su tamaño y fecha.
 * Si una subcarpeta no se puede leer se anota y se sigue; si falla la carpeta raíz
 * (disco desconectado, ruta inexistente) lanza el error, y el índice no se toca.
 */
async function discoverFiles(
  root: string,
  onError: (path: string, message: string) => void,
  signal?: AbortSignal
): Promise<DiscoveredFile[]> {
  const found: DiscoveredFile[] = []
  const pending = [root]

  while (pending.length > 0) {
    if (signal?.aborted) break
    const dir = pending.pop() as string

    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (err) {
      if (dir === root) throw err
      onError(dir, errorMessage(err))
      continue
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        pending.push(fullPath)
      } else if (entry.isFile() && isAudioFile(fullPath)) {
        try {
          const info = await stat(fullPath)
          // Se guarda como entero: así la comparación entre escaneos es exacta.
          found.push({ path: fullPath, size: info.size, mtimeMs: Math.floor(info.mtimeMs) })
        } catch (err) {
          onError(fullPath, errorMessage(err))
        }
      }
    }
  }
  return found
}

/** Crea las funciones que guardan una pista (y su artista/álbum) en la base de datos. */
function createTrackSaver(db: Database.Database, folderId: number): (item: PendingWrite) => void {
  const findArtist = db.prepare('SELECT id FROM artists WHERE name = ?')
  const insertArtist = db.prepare('INSERT INTO artists (name) VALUES (?)')
  const findAlbum = db.prepare('SELECT id FROM albums WHERE title = ? AND album_artist_id IS ?')
  const insertAlbum = db.prepare('INSERT INTO albums (title, album_artist_id, year) VALUES (?, ?, ?)')
  const fillAlbumYear = db.prepare('UPDATE albums SET year = ? WHERE id = ? AND year IS NULL')

  const insertTrack = db.prepare(`
    INSERT INTO tracks (
      folder_id, album_id, artist_id, file_path, file_size, file_mtime_ms,
      title, track_no, disc_no, has_tags, has_cover,
      duration_sec, codec, lossless, bitrate, sample_rate, bit_depth
    ) VALUES (
      @folderId, @albumId, @artistId, @filePath, @fileSize, @fileMtimeMs,
      @title, @trackNo, @discNo, @hasTags, @hasCover,
      @durationSec, @codec, @lossless, @bitrate, @sampleRate, @bitDepth
    )`)

  const updateTrack = db.prepare(`
    UPDATE tracks SET
      album_id = @albumId, artist_id = @artistId,
      file_path = @filePath, file_size = @fileSize, file_mtime_ms = @fileMtimeMs,
      title = @title, track_no = @trackNo, disc_no = @discNo,
      has_tags = @hasTags, has_cover = @hasCover,
      duration_sec = @durationSec, codec = @codec, lossless = @lossless,
      bitrate = @bitrate, sample_rate = @sampleRate, bit_depth = @bitDepth,
      scanned_at = datetime('now')
    WHERE id = @id`)

  const resolveArtist = (name: string | null): number | null => {
    if (!name) return null
    const row = findArtist.get(name) as { id: number } | undefined
    return row ? row.id : Number(insertArtist.run(name).lastInsertRowid)
  }

  const resolveAlbum = (title: string | null, artistId: number | null, year: number | null): number | null => {
    if (!title) return null
    const row = findAlbum.get(title, artistId) as { id: number } | undefined
    const id = row ? row.id : Number(insertAlbum.run(title, artistId, year).lastInsertRowid)
    if (row && year !== null) fillAlbumYear.run(year, id)
    return id
  }

  return ({ file, meta, existingId }) => {
    const artistId = resolveArtist(meta.artist)
    // Si el archivo no declara "artista del álbum", se usa el artista de la pista.
    // Limitación conocida: en recopilatorios sin ese tag el álbum se parte por artista;
    // la identificación con MusicBrainz (Sprint 5) es lo que lo resuelve de verdad.
    const albumArtistId = meta.albumArtist ? resolveArtist(meta.albumArtist) : artistId
    const albumId = resolveAlbum(meta.album, albumArtistId, meta.year)

    const params = {
      folderId,
      albumId,
      artistId,
      filePath: file.path,
      fileSize: file.size,
      fileMtimeMs: file.mtimeMs,
      title: meta.title,
      trackNo: meta.trackNo,
      discNo: meta.discNo,
      hasTags: meta.hasTags ? 1 : 0,
      hasCover: meta.hasCover ? 1 : 0,
      durationSec: meta.durationSec,
      codec: meta.codec,
      lossless: meta.lossless === null ? null : meta.lossless ? 1 : 0,
      bitrate: meta.bitrate,
      sampleRate: meta.sampleRate,
      bitDepth: meta.bitDepth
    }

    if (existingId !== null) updateTrack.run({ ...params, id: existingId })
    else insertTrack.run(params)
  }
}

/**
 * Escanea una carpeta raíz ya registrada y sincroniza el índice con lo que hay en disco.
 *
 * - Incremental: si un archivo conserva tamaño y fecha de modificación, no se vuelve a leer.
 * - Un archivo ilegible se anota en `scan_errors` y el escaneo continúa.
 * - Cancelable: al cancelar se guarda lo ya leído y NO se elimina nada del índice.
 * - Seguro: si la carpeta raíz no es accesible, lanza el error sin modificar el índice.
 */
export async function scanFolder(
  db: Database.Database,
  folderId: number,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const { onProgress, signal } = options

  const folder = db.prepare('SELECT id, path FROM folders WHERE id = ?').get(folderId) as
    | { id: number; path: string }
    | undefined
  if (!folder) throw new Error(`La carpeta ${folderId} no está registrada en la biblioteca.`)

  const result: ScanResult = {
    folderId,
    added: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    errors: 0,
    cancelled: false
  }

  const insertError = db.prepare('INSERT INTO scan_errors (folder_id, file_path, message) VALUES (?, ?, ?)')
  const logError = (filePath: string, message: string): void => {
    insertError.run(folderId, filePath, message)
    result.errors++
  }

  // El registro de errores refleja siempre el último escaneo.
  db.prepare('DELETE FROM scan_errors WHERE folder_id = ?').run(folderId)

  onProgress?.({ phase: 'discovering', processed: 0, total: 0, currentFile: null })
  const files = await discoverFiles(folder.path, logError, signal)
  if (signal?.aborted) {
    result.cancelled = true
    return result
  }

  // Estado actual del índice para esta carpeta. La clave va en minúsculas porque
  // en Windows "A.flac" y "a.flac" son el mismo archivo.
  const existing = new Map<string, ExistingTrack>()
  const rows = db
    .prepare('SELECT id, file_path, file_size, file_mtime_ms FROM tracks WHERE folder_id = ?')
    .all(folderId) as { id: number; file_path: string; file_size: number; file_mtime_ms: number }[]
  for (const r of rows) {
    existing.set(r.file_path.toLowerCase(), { id: r.id, size: r.file_size, mtimeMs: r.file_mtime_ms })
  }

  const stillOnDisk = new Set<number>()
  const saveTrack = createTrackSaver(db, folderId)
  const flush = db.transaction((items: PendingWrite[]) => {
    for (const item of items) saveTrack(item)
  })

  let batch: PendingWrite[] = []

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      result.cancelled = true
      break
    }

    const file = files[i]
    const previous = existing.get(file.path.toLowerCase())
    if (previous) stillOnDisk.add(previous.id)

    if (previous && previous.size === file.size && previous.mtimeMs === file.mtimeMs) {
      result.unchanged++
    } else {
      try {
        const meta = await extractMetadata(file.path)
        batch.push({ file, meta, existingId: previous?.id ?? null })
        if (previous) result.updated++
        else result.added++
      } catch (err) {
        logError(file.path, errorMessage(err))
      }
    }

    if (batch.length >= BATCH_SIZE) {
      flush(batch)
      batch = []
    }
    if (i % PROGRESS_EVERY === 0) {
      onProgress?.({ phase: 'reading', processed: i + 1, total: files.length, currentFile: file.path })
    }
  }
  if (batch.length > 0) flush(batch)

  if (!result.cancelled) {
    const stale = [...existing.values()].filter((t) => !stillOnDisk.has(t.id))

    if (files.length === 0 && existing.size > 0) {
      // Carpeta "vacía" pero el índice tenía pistas: puede ser un disco de red sin montar.
      // Es más seguro no borrar nada y avisar.
      logError(
        folder.path,
        `La carpeta no contiene archivos de audio, pero el índice tenía ${existing.size} pistas. ` +
          `No se eliminó nada por seguridad.`
      )
    } else if (stale.length > 0) {
      const remove = db.prepare('DELETE FROM tracks WHERE id = ?')
      db.transaction(() => {
        for (const t of stale) remove.run(t.id)
      })()
      result.removed = stale.length
    }

    pruneOrphans(db)
    db.prepare("UPDATE folders SET last_scan_at = datetime('now') WHERE id = ?").run(folderId)
    onProgress?.({ phase: 'reading', processed: files.length, total: files.length, currentFile: null })
  }

  return result
}