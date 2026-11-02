import { useEffect, useRef, useState } from 'react'
import '../assets/player.css'
import { fileName, formatDuration } from '../lib/format'

interface Props {
  track: TrackRow | null
}

export function PlayerBar({ track }: Props): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const getAudioDiagnostics = (audio: HTMLAudioElement): string => {
    const error = audio.error
    const code = error?.code ?? 0
    const codeName =
      code === MediaError.MEDIA_ERR_ABORTED
        ? 'ABORTED'
        : code === MediaError.MEDIA_ERR_NETWORK
          ? 'NETWORK'
          : code === MediaError.MEDIA_ERR_DECODE
            ? 'DECODE'
            : code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
              ? 'SRC_NOT_SUPPORTED'
              : 'UNKNOWN'
    return `code=${code} (${codeName}), message=${error?.message || 'sin mensaje'}, ` +
      `networkState=${audio.networkState}, readyState=${audio.readyState}, ` +
      `currentSrc=${audio.currentSrc || audio.src}`
  }

  const describeAudioError = (audio: HTMLAudioElement): string => {
    switch (audio.error?.code) {
      case MediaError.MEDIA_ERR_NETWORK:
        return 'No se pudo acceder al archivo.'
      case MediaError.MEDIA_ERR_DECODE:
        return 'El formato de este archivo no se pudo decodificar.'
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'El formato de este archivo no es compatible.'
      default:
        return 'No se pudo reproducir este archivo.'
    }
  }

  const reportAudioError = (audio: HTMLAudioElement): void => {
    const details = {
      filePath: track?.filePath,
      src: audio.currentSrc || audio.src,
      code: audio.error?.code ?? 0,
      message: audio.error?.message ?? '',
      networkState: audio.networkState,
      readyState: audio.readyState
    }
    console.error('[media] Audio playback error', details)
    window.api.reportMediaError(details)
    setError(`${describeAudioError(audio)} (${getAudioDiagnostics(audio)})`)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return

    setCurrentTime(0)
    setDuration(track.durationSec ?? 0)
    setError(null)
    let active = true
    let objectUrl: string | null = null
    void window.api
    .getTrackData(track.filePath)
    .then(({ data, mimeType }) => {
      if (!active) return
      const bytes = new Uint8Array(data.byteLength)
      bytes.set(data)
      objectUrl = URL.createObjectURL(new Blob([bytes.buffer], { type: mimeType }))
      audio.src = objectUrl
      audio.load()
      void audio.play().catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setPlaying(false)
        reportAudioError(audio)
      })
    })
    .catch((reason: unknown) => {
      if (!active) return
      const message = reason instanceof Error ? reason.message : String(reason)
      console.error('[media] Unable to load track data', {
        filePath: track.filePath,
        message
      })
      window.api.reportMediaError({ filePath: track.filePath, stage: 'read', message })
      setError(`No se pudo cargar la pista: ${message}`)
    })
    return () => {
      active = false
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [track])

  const togglePlayback = (): void => {
    const audio = audioRef.current
    if (!audio || !track) return

    if (audio.paused) {
      void audio.play().catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        reportAudioError(audio)
      })
    } else {
      audio.pause()
    }
  }

  const seek = (value: number): void => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
  }

  return (
    <footer className="player-bar">
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onError={(event) => {
          const audio = event.currentTarget
          reportAudioError(audio)
        }}
      />
      <div className="player-track">
        <strong title={track?.title ?? undefined}>
          {track?.title ?? (track ? fileName(track.filePath) : 'Nada en reproducción')}
        </strong>
        <span>
          {track?.artist ?? 'Artista desconocido'}
          {track?.album ? ` · ${track.album}` : ''}
        </span>
      </div>
      <button
        className="player-toggle"
        onClick={togglePlayback}
        disabled={!track}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <span className="player-time">{formatDuration(currentTime)}</span>
      <input
        className="player-progress"
        type="range"
        min="0"
        max={duration || 0}
        step="0.1"
        value={Math.min(currentTime, duration || 0)}
        disabled={!track || !duration}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Progreso de la pista"
      />
      <span className="player-time">{formatDuration(duration)}</span>
      {error && <span className="player-error">{error}</span>}
    </footer>
  )
}
