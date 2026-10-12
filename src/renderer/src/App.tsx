import { useCallback, useState } from 'react'
import { LibraryView } from './views/LibraryView'
import { TracksView } from './views/TracksView'

type Tab = 'library' | 'tracks'

const TABS: { id: Tab; label: string }[] = [
  { id: 'library', label: 'Biblioteca' },
  { id: 'tracks', label: 'Pistas' }
]

/**
 * Armazón de la aplicación: cabecera con pestañas. Las dos vistas permanecen montadas
 * y solo se ocultan, así un escaneo en curso conserva su progreso al cambiar de pestaña.
 */
function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('library')
  // Sube cada vez que el índice cambia; las vistas que lo reciben recargan sus datos.
  const [libraryVersion, setLibraryVersion] = useState(0)
  const onLibraryChanged = useCallback(() => setLibraryVersion((v) => v + 1), [])

  return (
    <>
      <header className="shell-header">
        <h1>SoundRacoon</h1>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="view" hidden={tab !== 'library'}>
        <LibraryView onLibraryChanged={onLibraryChanged} />
      </main>
      <main className="view" hidden={tab !== 'tracks'}>
        <TracksView version={libraryVersion} />
      </main>
    </>
  )
}

export default App