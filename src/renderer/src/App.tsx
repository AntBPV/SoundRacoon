import { useCallback, useEffect, useState } from 'react'

/**
 * Pantalla de pruebas del Sprint 1: sirve para añadir carpetas, escanearlas
 * y comprobar que el índice se llena bien. NO es la interfaz final.
 */
function App(): React.JSX.Element {
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [scanningId, setScanningId] = useState<number | null>(null)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [scanErrors, setScanErrors] = useState<ScanErrorRow[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [f, s] = await Promise.all([window.api.listFolders(), window.api.getLibraryStats()])
    if (f.ok) setFolders(f.data)
    if (s.ok) setStats(s.data)
  }, [])

  useEffect(() => {
    void refresh()
    return window.api.onScanProgress(setProgress)
  }, [refresh])

  const scan = useCallback(
    async (folderId: number) => {
      setMessage(null)
      setLastResult(null)
      setScanErrors([])
      setScanningId(folderId)
      const result = await window.api.startScan(folderId)
      setScanningId(null)
      setProgress(null)
      if (result.ok) {
        setLastResult(result.data)
        const errs = await window.api.getScanErrors(folderId)
        if (errs.ok) setScanErrors(errs.data)
      } else {
        setMessage(result.error)
      }
      await refresh()
    },
    [refresh]
  )

  const addFolder = async (): Promise<void> => {
    setMessage(null)
    const result = await window.api.pickAndAddFolder()
    if (!result.ok) return setMessage(result.error)
    if (result.data === null) return // el usuario cerró el diálogo
    await refresh()
    await scan(result.data.id) // al añadir una carpeta, se escanea de inmediato
  }

  const removeFolder = async (folder: FolderRow): Promise<void> => {
    if (!window.confirm(`¿Quitar "${folder.path}" de la biblioteca?\nTus archivos no se borran.`)) return
    const result = await window.api.removeFolder(folder.id)
    if (!result.ok) setMessage(result.error)
    setLastResult(null)
    setScanErrors([])
    await refresh()
  }

  const busy = scanningId !== null
  const percent = progress && progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <>
      <h1>Catalogar</h1>
      <p className="muted">Pantalla de pruebas del escáner · Sprint 1</p>

      <h2>Biblioteca</h2>
      <div className="panel stats">
        <div className="stat"><b>{stats?.tracks ?? 0}</b><span className="muted">pistas</span></div>
        <div className="stat"><b>{stats?.albums ?? 0}</b><span className="muted">álbumes</span></div>
        <div className="stat"><b>{stats?.artists ?? 0}</b><span className="muted">artistas</span></div>
        <div className="stat"><b>{stats?.tracksWithoutTags ?? 0}</b><span className="muted">sin tags</span></div>
        <div className="stat"><b>{stats?.scanErrors ?? 0}</b><span className="muted">con error</span></div>
      </div>

      <h2>Carpetas</h2>
      <div className="panel">
        {folders.length === 0 && <div className="folder muted">Aún no hay carpetas. Añade la primera.</div>}
        {folders.map((folder) => (
          <div className="folder" key={folder.id}>
            <div className="path">
              <div className="mono" title={folder.path}>{folder.path}</div>
              <div className="muted">
                {folder.last_scan_at ? `Último escaneo: ${folder.last_scan_at} (UTC)` : 'Sin escanear'}
              </div>
            </div>
            <button disabled={busy} onClick={() => void scan(folder.id)}>Volver a escanear</button>
            <button disabled={busy} onClick={() => void removeFolder(folder)}>Quitar</button>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 14 }}>
        <button className="primary" disabled={busy} onClick={() => void addFolder()}>Añadir carpeta…</button>
      </p>

      {busy && (
        <div className="panel" style={{ padding: 14, marginTop: 14 }}>
          <div>
            {progress?.phase === 'reading'
              ? `Leyendo ${progress.processed} de ${progress.total} archivos (${percent}%)`
              : 'Buscando archivos de audio…'}
          </div>
          <progress max={100} value={progress?.phase === 'reading' ? percent : undefined} />
          <div className="muted mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {progress?.currentFile ?? ' '}
          </div>
          <button style={{ marginTop: 8 }} onClick={() => void window.api.cancelScan()}>Cancelar escaneo</button>
        </div>
      )}

      {message && <div className="notice error">{message}</div>}

      {lastResult && (
        <div className={`notice ${lastResult.errors > 0 ? 'error' : 'ok'}`}>
          {lastResult.cancelled ? 'Escaneo cancelado. ' : 'Escaneo terminado. '}
          Nuevas: {lastResult.added} · Actualizadas: {lastResult.updated} · Sin cambios: {lastResult.unchanged} ·
          Eliminadas: {lastResult.removed} · Con error: {lastResult.errors}
        </div>
      )}

      {scanErrors.length > 0 && (
        <>
          <h2>Archivos que no se pudieron leer</h2>
          <ul className="panel errors">
            {scanErrors.map((e, i) => (
              <li key={i}>
                <div className="mono">{e.file_path}</div>
                <div className="muted">{e.message}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

export default App