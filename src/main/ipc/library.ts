import { getDb } from '../db'
import { listScanErrors, queryTracks } from '../db/tracks'
import { handle } from './handle'

export function registerLibraryIpc(): void {
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

  // Una página de pistas con búsqueda, filtro y orden aplicados en SQL.
  handle('library:tracks', (_event, query: TrackQuery) => queryTracks(getDb(), query))

  // Todos los archivos con error, de todas las carpetas.
  handle('library:errors', () => listScanErrors(getDb()))
}
