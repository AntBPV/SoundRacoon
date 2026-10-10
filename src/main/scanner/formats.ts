import { extname } from 'path'

/**
 * Extensiones que el escáner considera audio.
 * ALAC no tiene extensión propia: vive dentro de contenedores .m4a (o .mp4),
 * y music-metadata distingue ALAC de AAC al leer el archivo.
 */
export const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  '.flac',
  '.mp3',
  '.ogg',
  '.opus',
  '.m4a',
  '.wav'
])

export function isAudioFile(filePath: string): boolean {
  return AUDIO_EXTENSIONS.has(extname(filePath).toLowerCase())
}