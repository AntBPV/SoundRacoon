import { useEffect, useMemo, useState } from 'react'
import '../assets/tracks.css'
import { ErrorTable } from '../components/ErrorTable'
import { TrackTable } from '../components/TrackTable'
import type { TrackQueryBase } from '../hooks/usePagedTracks'

type Section = 'all' | 'untagged' | 'errors'

const SEARCH_DELAY_MS = 250

/** Lista de todas las pistas indexadas, con búsqueda, filtros y orden. Solo lectura. */
export function TracksView({
  version,
  onPlay
}: {
  version: number
  onPlay: (track: TrackRow) => void
}): React.JSX.Element {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [section, setSection] = useState<Section>('all')
  const [sort, setSort] = useState<Pick<TrackQueryBase, 'sortBy' | 'sortDir'>>({
    sortBy: 'artist',
    sortDir: 'asc'
  })
  const [stats, setStats] = useState<LibraryStats | null>(null)

  // La búsqueda se envía 250 ms después de dejar de escribir, no con cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Los contadores de las pestañas se actualizan cuando el índice cambia.
  useEffect(() => {
    let active = true
    void window.api.getLibraryStats().then((result) => {
      if (active && result.ok) setStats(result.data)
    })
    return () => {
      active = false
    }
  }, [version])

  const query = useMemo<TrackQueryBase>(
    () => ({ search, filter: section === 'untagged' ? 'untagged' : 'all', ...sort }),
    [search, section, sort]
  )

  // Pulsar la misma columna invierte el orden; otra columna empieza en ascendente.
  const toggleSort = (key: TrackSortKey): void =>
    setSort((prev) =>
      prev.sortBy === key
        ? { sortBy: key, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }
        : { sortBy: key, sortDir: 'asc' }
    )

  const sections: { id: Section; label: string; count: number | undefined }[] = [
    { id: 'all', label: 'Todas', count: stats?.tracks },
    { id: 'untagged', label: 'Sin tags', count: stats?.tracksWithoutTags },
    { id: 'errors', label: 'Con error', count: stats?.scanErrors }
  ]

  return (
    <div className="tracks-view">
      <div className="trk-toolbar">
        <input
          className="trk-search"
          type="search"
          value={searchInput}
          disabled={section === 'errors'}
          placeholder={
            section === 'errors'
              ? 'La búsqueda no aplica a los archivos con error'
              : 'Buscar por título, artista, álbum o ruta…'
          }
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <div className="trk-chips">
          {sections.map((s) => (
            <button
              key={s.id}
              className={`chip${section === s.id ? ' active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
              {s.count !== undefined && (
                <span className="chip-count">{s.count.toLocaleString('es')}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {section === 'errors' ? (
        <ErrorTable version={version} />
      ) : (
        <TrackTable query={query} version={version} onSort={toggleSort} onPlay={onPlay} />
      )}
    </div>
  )
}
