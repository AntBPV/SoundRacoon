import { useEffect, useState } from 'react'
import '../assets/tracks.css'
import { cleanMessage, formatUtcTimestamp } from '../lib/format'

/**
 * Archivos que no se pudieron leer en el último escaneo de su carpeta.
 * Siempre disponible: no depende de haber escaneado hace un momento.
 */
export function ErrorTable({ version }: { version: number }): React.JSX.Element {
  const [data, setData] = useState<LibraryErrors | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void window.api.getAllScanErrors().then((result) => {
      if (!active) return
      if (result.ok) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    })
    return () => {
      active = false
    }
  }, [version])

  if (error) return <div className="trk-empty trk-error">{error}</div>
  if (!data) return <div className="trk-empty">Cargando…</div>
  if (data.total === 0) {
    return <div className="trk-empty">Ningún archivo falló en el último escaneo. ✓</div>
  }

  return (
    <div className="trk-wrap">
      <p className="muted err-intro">
        Archivos con extensión de audio que no se pudieron leer. No aparecen en la lista de pistas.
        Los de formato inválido (vacíos o dañados) se retiran del índice; los que fallaron por un
        error del sistema (bloqueados, disco con problemas) conservan su última lectura.
      </p>
      <div className="trk-scroll">
        {data.rows.map((row) => (
          <div className="err-row" key={row.id}>
            <div className="trk-mono err-path" title={row.filePath}>
              {row.filePath}
            </div>
            <div className="err-message">{cleanMessage(row.message)}</div>
            <div className="muted err-when">{formatUtcTimestamp(row.occurredAt)}</div>
          </div>
        ))}
      </div>
      <div className="trk-status">
        {data.rows.length < data.total
          ? `Mostrando ${data.rows.length} de ${data.total} archivos con error`
          : `${data.total} ${data.total === 1 ? 'archivo con error' : 'archivos con error'}`}
      </div>
    </div>
  )
}
