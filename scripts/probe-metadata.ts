/**
 * Prueba suelta de la extracción de metadata, SIN Electron ni base de datos.
 *
 * Uso:
 *   npx tsx scripts/probe-metadata.ts "D:\Musica" 10
 *
 * Argumentos: carpeta a recorrer y cuántos archivos probar (por defecto 10).
 */
import { readdir } from 'fs/promises'
import { join } from 'path'
import { extractMetadata } from '../src/main/scanner/metadata'
import { isAudioFile } from '../src/main/scanner/formats'

/** Recorre carpetas de forma recursiva y devuelve hasta `limit` archivos de audio. */
async function collectAudioFiles(dir: string, limit: number, found: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (found.length >= limit) break
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectAudioFiles(fullPath, limit, found)
    } else if (entry.isFile() && isAudioFile(fullPath)) {
      found.push(fullPath)
    }
  }
  return found
}

async function main(): Promise<void> {
  const folder = process.argv[2]
  const limit = Number(process.argv[3] ?? 10)

  if (!folder) {
    console.error('Uso: npx tsx scripts/probe-metadata.ts "<carpeta>" [cantidad]')
    process.exit(1)
  }

  const files = await collectAudioFiles(folder, limit)
  console.log(`\nProbando ${files.length} archivo(s) de ${folder}\n`)

  const rows: Record<string, unknown>[] = []
  const errors: { file: string; message: string }[] = []

  for (const file of files) {
    try {
      const t = await extractMetadata(file)
      rows.push({
        archivo: file.slice(folder.length).replace(/^[\\/]/, ''),
        titulo: t.title ?? '—',
        artista: t.artist ?? '—',
        album: t.album ?? '—',
        pista: t.trackNo ?? '—',
        tags: t.hasTags ? 'sí' : 'NO',
        portada: t.hasCover ? 'sí' : 'no',
        codec: t.codec ?? '—',
        'bits/Hz': `${t.bitDepth ?? '?'}/${t.sampleRate ?? '?'}`,
        seg: t.durationSec !== null ? Math.round(t.durationSec) : '—'
      })
    } catch (err) {
      // Un archivo roto no debe detener el resto: se anota y se sigue.
      errors.push({ file, message: err instanceof Error ? err.message : String(err) })
    }
  }

  console.table(rows)
  console.log(`\nLeídos: ${rows.length}  |  Con error: ${errors.length}`)
  for (const e of errors) console.log(`  ✗ ${e.file}\n    ${e.message}`)
}

main().catch((err) => {
  console.error('Fallo inesperado:', err)
  process.exit(1)
})