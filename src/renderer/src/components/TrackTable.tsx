import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'
import '../assets/tracks.css'
import { PAGE_SIZE, usePagedTracks, type TrackQueryBase } from '../hooks/usePagedTracks'
import { fileName, formatDuration, formatQuality } from '../lib/format'

const ROW_HEIGHT = 32
const HEADER_HEIGHT = 34

/** sortKey null = columna informativa que no se puede ordenar. numeric = alineada a la derecha. */
const COLUMNS: { sortKey: TrackSortKey | null; label: string; numeric?: boolean }[] = [
  { sortKey: null, label: '' },
  { sortKey: null, label: '#', numeric: true },
  { sortKey: null, label: 'Disco', numeric: true },
  { sortKey: 'title', label: 'Título' },
  { sortKey: 'artist', label: 'Artista' },
  { sortKey: 'album', label: 'Álbum' },
  { sortKey: 'year', label: 'Año', numeric: true },
  { sortKey: 'duration', label: 'Duración', numeric: true },
  { sortKey: 'format', label: 'Formato' },
  { sortKey: null, label: 'Portada' },
  { sortKey: 'path', label: 'Ruta' }
]

interface Props {
  query: TrackQueryBase
  /** Cambia cuando el índice cambió: fuerza a recargar. */
  version: number
  onSort: (key: TrackSortKey) => void
  onPlay: (track: TrackRow) => void
}

/** Las celdas de una pista, en el mismo orden que COLUMNS. */
function TrackCells({
  row,
  onPlay
}: {
  row: TrackRow
  onPlay: (track: TrackRow) => void
}): React.JSX.Element {
  const dash = <span className="trk-dim">—</span>
  return (
    <>
      <button
        className="trk-play"
        onClick={() => onPlay(row)}
        aria-label={`Reproducir ${row.title ?? fileName(row.filePath)}`}
      >
        ▶
      </button>
      <span className="trk-num">{row.trackNo ?? dash}</span>
      <span className="trk-num">{row.discNo ?? dash}</span>
      {/* Sin título en los tags: se muestra el nombre del archivo, atenuado. */}
      {row.title ? (
        <span className="trk-cell" title={row.title}>
          {row.title}
        </span>
      ) : (
        <span className="trk-cell trk-untitled" title="Este archivo no tiene título en sus tags">
          {fileName(row.filePath)}
        </span>
      )}
      <span className="trk-cell" title={row.artist ?? undefined}>
        {row.artist ?? dash}
      </span>
      <span className="trk-cell" title={row.album ?? undefined}>
        {row.album ?? dash}
      </span>
      <span className="trk-num">{row.year ?? dash}</span>
      <span className="trk-num">{formatDuration(row.durationSec)}</span>
      <span className="trk-cell">{formatQuality(row)}</span>
      <span className="trk-cell">{row.hasCover ? 'sí' : dash}</span>
      <span className="trk-cell trk-mono" title={row.filePath}>
        {row.filePath}
      </span>
    </>
  )
}

export function TrackTable({ query, version, onSort, onPlay }: Props): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Rango de páginas que se ven en pantalla; lo actualiza la lista virtual al hacer scroll.
  const [visible, setVisible] = useState({ start: 0, end: 0 })
  const { total, getRow, loading, error } = usePagedTracks(query, version, visible)

  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer es la API oficial de TanStack
  const virtualizer = useVirtualizer({
    count: total,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    scrollMargin: HEADER_HEIGHT, // la cabecera ocupa espacio dentro del mismo contenedor con scroll
    overscan: 12,
    onChange: (instance) => {
      const items = instance.getVirtualItems()
      if (items.length === 0) return
      const start = Math.floor(items[0].index / PAGE_SIZE)
      const end = Math.floor(items[items.length - 1].index / PAGE_SIZE)
      setVisible((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
  })

  // Otra búsqueda u otro orden: se vuelve al principio de la lista.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [query])

  const status = error ? (
    <span className="trk-error">{error}</span>
  ) : loading ? (
    'Cargando…'
  ) : (
    `${total.toLocaleString('es')} ${total === 1 ? 'pista' : 'pistas'}`
  )

  return (
    <div className="trk-wrap">
      <div className="trk-scroll" ref={scrollRef}>
        <div className="trk-header trk-grid" style={{ height: HEADER_HEIGHT }}>
          {COLUMNS.map((col) =>
            col.sortKey ? (
              <button
                key={col.label}
                className={`trk-th trk-sortable${col.numeric ? ' trk-th-num' : ''}`}
                onClick={() => onSort(col.sortKey as TrackSortKey)}
              >
                {col.label}
                {query.sortBy === col.sortKey && (query.sortDir === 'asc' ? ' ▲' : ' ▼')}
              </button>
            ) : (
              <span key={col.label} className={`trk-th${col.numeric ? ' trk-th-num' : ''}`}>
                {col.label}
              </span>
            )
          )}
        </div>

        {!loading && total === 0 && (
          <div className="trk-empty">
            {query.search || query.filter !== 'all'
              ? 'Ninguna pista coincide con la búsqueda.'
              : 'Aún no hay pistas. Añade una carpeta en la pestaña Biblioteca.'}
          </div>
        )}

        <div className="trk-body" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = getRow(item.index)
            return (
              <div
                key={item.index}
                className={`trk-row trk-grid${item.index % 2 ? ' trk-odd' : ''}`}
                style={{
                  height: item.size,
                  transform: `translateY(${item.start - HEADER_HEIGHT}px)`
                }}
              >
                {row ? (
                  <TrackCells row={row} onPlay={onPlay} />
                ) : (
                  <span className="trk-dim">…</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="trk-status">{status}</div>
    </div>
  )
}
