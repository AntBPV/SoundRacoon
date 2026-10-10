import type Database from 'better-sqlite3'
import { resolve, sep } from 'path'

export interface FolderRow {
  id: number
  path: string
  added_at: string
  last_scan_at: string | null
}

/** Compara rutas sin distinguir mayúsculas (Windows) y respetando el límite de carpeta. */
function isSameOrInside(candidate: string, parent: string): boolean {
  const c = candidate.toLowerCase()
  const p = parent.toLowerCase()
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep)
}

export function listFolders(db: Database.Database): FolderRow[] {
  return db.prepare('SELECT id, path, added_at, last_scan_at FROM folders ORDER BY path').all() as FolderRow[]
}

/**
 * Registra una carpeta raíz. Rechaza carpetas que ya estén indexadas o que se
 * solapen con una existente: si "D:\Musica" ya está, añadir "D:\Musica\Rock"
 * (o al revés) duplicaría pistas, porque cada archivo solo puede vivir una vez.
 */
export function addFolder(db: Database.Database, rawPath: string): FolderRow {
  const path = resolve(rawPath)

  for (const existing of listFolders(db)) {
    if (isSameOrInside(path, existing.path)) {
      throw new Error(
        path.toLowerCase() === existing.path.toLowerCase()
          ? `La carpeta "${path}" ya está en tu biblioteca.`
          : `"${path}" ya está incluida dentro de "${existing.path}".`
      )
    }
    if (isSameOrInside(existing.path, path)) {
      throw new Error(
        `"${path}" contiene a "${existing.path}", que ya está en tu biblioteca. ` +
          `Quita primero esa carpeta si quieres indexar la de nivel superior.`
      )
    }
  }

  const info = db.prepare('INSERT INTO folders (path) VALUES (?)').run(path)
  return db
    .prepare('SELECT id, path, added_at, last_scan_at FROM folders WHERE id = ?')
    .get(info.lastInsertRowid) as FolderRow
}

/** Quita una carpeta del índice. Sus pistas se borran en cascada; los archivos en disco no se tocan. */
export function removeFolder(db: Database.Database, folderId: number): void {
  db.transaction(() => {
    db.prepare('DELETE FROM folders WHERE id = ?').run(folderId)
    pruneOrphans(db)
  })()
}

/** Elimina álbumes y artistas que se quedaron sin ninguna pista asociada. */
export function pruneOrphans(db: Database.Database): void {
  db.exec(`
    DELETE FROM albums
      WHERE id NOT IN (SELECT album_id FROM tracks WHERE album_id IS NOT NULL);

    DELETE FROM artists
      WHERE id NOT IN (SELECT artist_id FROM tracks WHERE artist_id IS NOT NULL)
        AND id NOT IN (SELECT album_artist_id FROM albums WHERE album_artist_id IS NOT NULL);
  `)
}