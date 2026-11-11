import { useEffect, useState } from 'react'

export function SettingsView(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [configured, setConfigured] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void window.api.getAcoustIdConfigStatus().then((result) => {
      if (result.ok) setConfigured(result.data.configured)
      else setError(result.error)
    })
  }, [])

  const save = async (): Promise<void> => {
    setSaving(true)
    setMessage(null)
    setError(null)
    const result = await window.api.saveAcoustIdApiKey(apiKey)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setApiKey('')
    setConfigured(true)
    setMessage('Clave guardada correctamente.')
  }

  return (
    <div className="view-scroll">
      <div className="narrow settings">
        <h2>Configuración</h2>
        <section className="panel settings-panel">
          <h3>AcoustID</h3>
          <p className="muted">
            Introduce tu clave personal de AcoustID. Se almacena cifrada en este dispositivo y no
            se incluye en el instalador.
          </p>
          <label htmlFor="acoustid-api-key">Clave de API</label>
          <input
            id="acoustid-api-key"
            type="password"
            value={apiKey}
            placeholder={configured ? 'Clave configurada; introduce otra para reemplazarla' : ''}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
          />
          <button className="primary" disabled={saving || !apiKey.trim()} onClick={() => void save()}>
            {saving ? 'Guardando...' : 'Guardar clave'}
          </button>
          {configured && <p className="muted">Hay una clave configurada para este usuario.</p>}
          {message && <div className="notice ok">{message}</div>}
          {error && <div className="notice error">{error}</div>}
        </section>
      </div>
    </div>
  )
}
