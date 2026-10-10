import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { migrations } from './migrations'

let db: Database.Database | null = null

/** Abre la base de datos (la crea si no existe) y aplica migraciones pendientes. */
export function initDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'catalogar.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL') // mejor rendimiento en escrituras masivas (escaneo)
  db.pragma('foreign_keys = ON') // SQLite lo trae apagado por defecto

  runMigrations(db)
  console.log(`[db] lista en ${dbPath}`)
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('La base de datos no se ha inicializado. Llama a initDb() primero.')
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}

function runMigrations(database: Database.Database): void {
  // user_version es un entero que SQLite guarda dentro del propio archivo.
  // Lo usamos para saber hasta qué migración ya se aplicó.
  const current = database.pragma('user_version', { simple: true }) as number
  const pending = migrations.filter((m) => m.version > current)

  for (const migration of pending) {
    // Cada migración corre en una transacción: o se aplica completa o no se aplica.
    database.transaction(() => {
      database.exec(migration.sql)
      database.pragma(`user_version = ${migration.version}`)
    })()
    console.log(`[db] migración ${migration.version} aplicada: ${migration.description}`)
  }
}