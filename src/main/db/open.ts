import Database from 'better-sqlite3'
import { migrations } from './migrations'
import { baseName, foldText } from './text'

/**
 * Abre (o crea) una base de datos SQLite y aplica las migraciones pendientes.
 * No depende de Electron a propósito: así se puede usar también en scripts y pruebas.
 */
export function openDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL') // mejor rendimiento en escrituras masivas (escaneo)
  db.pragma('foreign_keys = ON') // SQLite lo trae apagado por defecto

  // fold(texto): minúsculas y sin tildes. Lo usan la búsqueda y el orden de la biblioteca.
  db.function('fold', { deterministic: true }, (value: unknown) =>
    typeof value === 'string' ? foldText(value) : null
  )

  // file_name(ruta): solo el nombre del archivo. Ordena las pistas sin título como se muestran.
  db.function('file_name', { deterministic: true }, (value: unknown) =>
    typeof value === 'string' ? baseName(value) : null
  )

  runMigrations(db)
  return db
}

function runMigrations(db: Database.Database): void {
  // user_version es un entero que SQLite guarda dentro del propio archivo.
  // Lo usamos para saber hasta qué migración ya se aplicó.
  const current = db.pragma('user_version', { simple: true }) as number
  const pending = migrations.filter((m) => m.version > current)

  for (const migration of pending) {
    // Cada migración corre en una transacción: o se aplica completa o no se aplica.
    db.transaction(() => {
      db.exec(migration.sql)
      db.pragma(`user_version = ${migration.version}`)
    })()
    console.log(`[db] migración ${migration.version} aplicada: ${migration.description}`)
  }
}
