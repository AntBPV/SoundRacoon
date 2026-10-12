export interface Migration {
  version: number
  description: string
  sql: string
}

/**
 * Lista ordenada de migraciones. Regla de oro: NUNCA edites una migración
 * que ya se ejecutó en tu base de datos. Si necesitas cambiar algo, añade
 * una migración nueva al final con el siguiente número de versión.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Esquema inicial: carpetas, artistas, álbumes, pistas y errores de escaneo',
    sql: `
      -- Carpetas raíz que el usuario ha elegido indexar
      CREATE TABLE folders (
        id           INTEGER PRIMARY KEY,
        path         TEXT NOT NULL UNIQUE COLLATE NOCASE,
        added_at     TEXT NOT NULL DEFAULT (datetime('now')),
        last_scan_at TEXT
      );

      CREATE TABLE artists (
        id   INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
      );

      CREATE TABLE albums (
        id              INTEGER PRIMARY KEY,
        title           TEXT NOT NULL COLLATE NOCASE,
        album_artist_id INTEGER REFERENCES artists(id) ON DELETE SET NULL,
        year            INTEGER
      );

      -- Un álbum se identifica por (título, artista del álbum).
      -- COALESCE evita que dos álbumes sin artista se dupliquen, porque en
      -- SQLite dos NULL cuentan como valores distintos en un UNIQUE normal.
      CREATE UNIQUE INDEX idx_albums_identity
        ON albums (title, COALESCE(album_artist_id, 0));

      CREATE TABLE tracks (
        id            INTEGER PRIMARY KEY,
        folder_id     INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
        album_id      INTEGER REFERENCES albums(id) ON DELETE SET NULL,
        artist_id     INTEGER REFERENCES artists(id) ON DELETE SET NULL,

        -- Archivo físico. size + mtime permiten el escaneo incremental:
        -- si ambos coinciden con lo guardado, no hace falta releer los tags.
        file_path     TEXT NOT NULL UNIQUE COLLATE NOCASE,
        file_size     INTEGER NOT NULL,
        file_mtime_ms INTEGER NOT NULL,

        -- Tags (todos opcionales: un archivo puede no traer nada)
        title         TEXT,
        track_no      INTEGER,
        disc_no       INTEGER,
        has_tags      INTEGER NOT NULL DEFAULT 0 CHECK (has_tags IN (0, 1)),
        has_cover     INTEGER NOT NULL DEFAULT 0 CHECK (has_cover IN (0, 1)),

        -- Propiedades técnicas del audio
        duration_sec  REAL,
        codec         TEXT,
        lossless      INTEGER CHECK (lossless IN (0, 1)),
        bitrate       INTEGER,
        sample_rate   INTEGER,
        bit_depth     INTEGER,

        scanned_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_tracks_folder ON tracks (folder_id);
      CREATE INDEX idx_tracks_album  ON tracks (album_id);
      CREATE INDEX idx_tracks_artist ON tracks (artist_id);

      -- Archivos que no se pudieron leer (corruptos, sin permisos, etc.)
      CREATE TABLE scan_errors (
        id          INTEGER PRIMARY KEY,
        folder_id   INTEGER REFERENCES folders(id) ON DELETE CASCADE,
        file_path   TEXT NOT NULL,
        message     TEXT NOT NULL,
        occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_scan_errors_folder ON scan_errors (folder_id);
    `
  },
  {
    version: 2,
    description: 'Año de lanzamiento por pista (antes solo se guardaba en el álbum)',
    // Las pistas ya guardadas quedan con year = NULL hasta que se las relea
    // con "Reescanear todo": el escaneo incremental no toca archivos sin cambios.
    sql: `
      ALTER TABLE tracks ADD COLUMN year INTEGER;
    `

  }
]