import { parseFile } from 'music-metadata'

/**
 * Lo que sabemos de un archivo de audio tras leerlo.
 * Los nombres y tipos son deliberadamente paralelos a las columnas de la
 * tabla `tracks`, para que guardarlo luego sea casi un mapeo directo.
 * `null` significa "el archivo no lo dice", nunca "error".
 */
export interface ExtractedTrack {
  // Tags
  title: string | null
  artist: string | null
  albumArtist: string | null
  album: string | null
  year: number | null
  trackNo: number | null
  discNo: number | null
  hasTags: boolean
  hasCover: boolean
  // Propiedades técnicas
  durationSec: number | null
  codec: string | null
  lossless: boolean | null
  bitrate: number | null
  sampleRate: number | null
  bitDepth: number | null
}

/** Texto limpio, o null si está vacío. Los tags mal escritos suelen traer espacios sobrantes. */
function cleanText(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Los tags de número de pista/disco a veces vienen como 0 o null; ambos significan "sin dato". */
function cleanPositiveInt(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function cleanNumber(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Lee un archivo de audio y devuelve sus tags y propiedades técnicas.
 *
 * Lanza una excepción si el archivo no se puede leer (corrupto, formato
 * desconocido, sin permisos). NO la captura: quien llama (el escáner) decide
 * qué hacer, que es registrar el error en `scan_errors` y seguir con el resto.
 */
export async function extractMetadata(filePath: string): Promise<ExtractedTrack> {
  const { common, format } = await parseFile(filePath)

  const title = cleanText(common.title)
  const artist = cleanText(common.artist)
  const albumArtist = cleanText(common.albumartist)
  const album = cleanText(common.album)

  return {
    title,
    artist,
    albumArtist,
    album,
    year: cleanPositiveInt(common.year),
    trackNo: cleanPositiveInt(common.track.no),
    discNo: cleanPositiveInt(common.disk.no),
    // "Tiene tags" = al menos uno de los tres que identifican una canción.
    hasTags: title !== null || artist !== null || album !== null,
    hasCover: (common.picture?.length ?? 0) > 0,

    durationSec: cleanNumber(format.duration),
    codec: cleanText(format.codec),
    lossless: typeof format.lossless === 'boolean' ? format.lossless : null,
    bitrate: cleanNumber(format.bitrate) !== null ? Math.round(format.bitrate as number) : null,
    sampleRate: cleanNumber(format.sampleRate),
    // En formatos con pérdida (MP3, AAC, Vorbis) la profundidad de bits no existe
    // como tal; algunos decodificadores devuelven 16 por defecto y engañaría.
    bitDepth: format.lossless === false ? null : cleanNumber(format.bitsPerSample)
  }
}