/** Nombre del archivo sin su carpeta. Funciona con rutas de Windows (\) y de otros sistemas (/). */
export function fileName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

/** 187.4 → "3:07"; 3725 → "1:02:05". Sin dato → "—". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Nombre corto del códec: "MPEG 1 Layer 3" → "MP3", "Vorbis I" → "Vorbis". */
export function shortCodec(codec: string | null): string {
  if (!codec) return '—'
  if (/layer\s*3/i.test(codec)) return 'MP3'
  if (/aac/i.test(codec)) return 'AAC'
  if (/^vorbis/i.test(codec)) return 'Vorbis'
  return codec
}

/** 44100 → "44.1", 48000 → "48". */
function formatKhz(hz: number): string {
  return String(Math.round(hz / 100) / 10)
}

/**
 * Calidad del archivo en una línea. Sin pérdida: "FLAC 24/48" (bits/kHz).
 * Con pérdida: "MP3 192 kbps". La profundidad de bits no se muestra en formatos con
 * pérdida porque ahí no existe como tal.
 */
export function formatQuality(
  track: Pick<TrackRow, 'codec' | 'lossless' | 'bitDepth' | 'sampleRate' | 'bitrate'>
): string {
  if (!track.codec) return '—'
  const name = shortCodec(track.codec)
  if (track.lossless === true) {
    const bits = track.bitDepth ?? '?'
    const khz = track.sampleRate ? formatKhz(track.sampleRate) : '?'
    return `${name} ${bits}/${khz}`
  }
  if (track.bitrate) return `${name} ${Math.round(track.bitrate / 1000)} kbps`
  return name
}

/** Quita caracteres de control: los mensajes de error de algunos formatos traen bytes binarios. */
export function cleanMessage(message: string): string {
  return message.replace(/\p{Cc}/gu, '')
}

/** "2026-10-11 15:41:54" (UTC, como lo guarda SQLite) → fecha y hora en la zona del usuario. */
export function formatUtcTimestamp(value: string): string {
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es')
}
