import type Database from 'better-sqlite3'
import { foldText } from './text'

// Los tipos TrackQuery, TrackRow, TrackPage, LibraryErrors... están declarados en
// src/preload/index.d.ts: es el contrato único entre este proceso y la interfaz.

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500 // tope por petición: nunca se manda la tabla entera a la interfaz
const MAX_ERRORS = 2000

/**
 * Orden permitido por cada columna. Se escribe a mano (nunca se arma SQL con texto de
 * la interfaz) y cada orden desempata con columnas que dan un resultado natural y estable.
 */
const SORTS: Record<TrackSortKey, { primary: string; then: string[] }> = {
  // Sin título se muestra el nombre del archivo, así que se ordena por ese mismo nombre
  title: { primary: 'fold(COALESCE(t.title, file_name(t.file_path)))', then: [] },
  artist: { primary: 'fold(a.name)', then: ['fold(al.title)', 't.disc_no', 't.track_no'] },
  album: { primary: 'fold(al.title)', then: ['t.disc_no', 't.track_no'] },
  year: { primary: 't.year', then: ['fold(al.title)', 't.disc_no', 't.track_no'] },
  duration: { primary: 't.duration_sec', then: [] },
  format: { primary: 'fold(t.codec)', then: ['t.bit_depth', 't.sample_rate'] },
  path: { primary: 'fold(t.file_path)', then: [] }
}

const FROM = `
  FROM tracks t
  LEFT JOIN artists a  ON a.id  = t.artist_id
  LEFT JOIN albums  al ON al.id = t.album_id`

/** Escapa los comodines de LIKE para que buscar "50%" no signifique "50 y cualquier cosa". */
const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Cada palabra de la búsqueda debe aparecer en el título, artista, álbum o ruta
 * (sin importar tildes ni mayúsculas): "radiohead rainbows" encuentra artista + álbum.
 */
function buildWhere(query: Pick<TrackQuery, 'search' | 'filter'>): {
  sql: string
  params: string[]
} {
  const clauses: string[] = []
  const params: string[] = []

  if (query.filter === 'untagged') clauses.push('t.has_tags = 0')

  for (const term of foldText(query.search).split(/\s+/).filter(Boolean)) {
    const like = `%${escapeLike(term)}%`
    clauses.push(
      `(fold(t.title) LIKE ? ESCAPE '\\' OR fold(a.name) LIKE ? ESCAPE '\\'
        OR fold(al.title) LIKE ? ESCAPE '\\' OR fold(t.file_path) LIKE ? ESCAPE '\\')`
    )
    params.push(like, like, like, like)
  }

  return { sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params }
}

/** Convierte un valor de la interfaz en un entero dentro de [min, max]. */
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

interface RawTrackRow extends Omit<TrackRow, 'lossless' | 'hasCover' | 'hasTags'> {
  lossless: number | null
  hasCover: number
  hasTags: number
}

/** Una página de pistas más el total que cumple la búsqueda y el filtro. */
export function queryTracks(db: Database.Database, query: TrackQuery): TrackPage {
  const sort = Object.hasOwn(SORTS, query.sortBy) ? SORTS[query.sortBy] : SORTS.artist
  const direction = query.sortDir === 'desc' ? 'DESC' : 'ASC'
  const limit = clampInt(query.limit, 1, MAX_LIMIT, DEFAULT_LIMIT)
  const offset = clampInt(query.offset, 0, Number.MAX_SAFE_INTEGER, 0)
  const where = buildWhere(query)

  // Los valores vacíos van siempre al final, sea cual sea la dirección.
  const orderBy = [
    `(${sort.primary} IS NULL)`,
    `${sort.primary} ${direction}`,
    ...sort.then.flatMap((column) => [`(${column} IS NULL)`, column]),
    't.id' // desempate final: sin él, la paginación podría repetir o saltarse filas
  ].join(', ')

  const total = (
    db.prepare(`SELECT COUNT(*) AS n ${FROM} ${where.sql}`).get(...where.params) as { n: number }
  ).n

  const raw = db
    .prepare(
      `SELECT t.id, t.file_path AS filePath, t.title, a.name AS artist, al.title AS album,
              t.track_no AS trackNo, t.disc_no AS discNo, t.year,
              t.duration_sec AS durationSec, t.codec, t.lossless,
              t.bit_depth AS bitDepth, t.sample_rate AS sampleRate, t.bitrate,
              t.has_cover AS hasCover, t.has_tags AS hasTags
       ${FROM} ${where.sql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...where.params, limit, offset) as RawTrackRow[]

  const rows: TrackRow[] = raw.map((r) => ({
    ...r,
    lossless: r.lossless === null ? null : r.lossless === 1,
    hasCover: r.hasCover === 1,
    hasTags: r.hasTags === 1
  }))

  return { total, rows }
}

/** Archivos con error de todas las carpetas (los más recientes del último escaneo de cada una). */
export function listScanErrors(db: Database.Database): LibraryErrors {
  const total = (db.prepare('SELECT COUNT(*) AS n FROM scan_errors').get() as { n: number }).n

  const rows = db
    .prepare(
      `SELECT e.id, e.file_path AS filePath, e.message, e.occurred_at AS occurredAt,
              f.path AS folderPath
       FROM scan_errors e
       LEFT JOIN folders f ON f.id = e.folder_id
       ORDER BY fold(e.file_path), e.id
       LIMIT ?`
    )
    .all(MAX_ERRORS) as LibraryErrorRow[]

  return { total, rows }
}
