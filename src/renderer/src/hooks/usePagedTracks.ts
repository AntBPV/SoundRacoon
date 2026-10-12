import { useEffect, useRef, useState } from 'react'

/** Pistas por petición al proceso principal. */
export const PAGE_SIZE = 100

export type TrackQueryBase = Omit<TrackQuery, 'offset' | 'limit'>

interface PagedData {
  key: string
  total: number
  pages: Record<number, TrackRow[]>
}

export interface PagedTracks {
  /** Pistas que cumplen la consulta (no solo las ya cargadas). */
  total: number
  /** La pista en esa posición, o undefined si su página todavía no llegó. */
  getRow: (index: number) => TrackRow | undefined
  /** true mientras llega la primera página de una consulta nueva. */
  loading: boolean
  error: string | null
}

/**
 * Carga las pistas por páginas, solo las que se están viendo.
 *
 * Con 20.000 pistas no se manda la tabla entera a la interfaz: llega la página 0,
 * que trae el total (la barra de scroll ya tiene su tamaño real), y después se piden solo
 * las páginas que cubre `visible` (rango de páginas en pantalla, que da la lista virtual).
 *
 * Una consulta nueva (otra búsqueda, otro orden, o `version` distinta) empieza de cero, y
 * mientras llega se siguen mostrando los datos anteriores en vez de vaciar la tabla.
 */
export function usePagedTracks(
  query: TrackQueryBase,
  version: number,
  visible: { start: number; end: number }
): PagedTracks {
  const key = JSON.stringify([query, version])
  const [data, setData] = useState<PagedData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const latestKey = useRef(key) // para descartar respuestas de consultas ya reemplazadas
  const requested = useRef(new Set<number>()) // páginas ya pedidas para la consulta actual

  useEffect(() => {
    if (latestKey.current !== key) {
      latestKey.current = key
      requested.current.clear()
    }

    // 1) La página 0 de una consulta nueva trae el total.
    // 2) Con el total conocido, se piden las páginas visibles que falten.
    const wanted: number[] = []
    if (data?.key !== key) {
      wanted.push(0)
    } else {
      for (let page = visible.start; page <= visible.end; page++) {
        if (!data.pages[page]) wanted.push(page)
      }
    }

    for (const page of wanted) {
      if (requested.current.has(page)) continue
      requested.current.add(page)

      void window.api
        .getTracks({ ...query, offset: page * PAGE_SIZE, limit: PAGE_SIZE })
        .then((result) => {
          if (latestKey.current !== key) return // llegó tarde: la consulta ya cambió
          if (!result.ok) {
            requested.current.delete(page)
            setError(result.error)
            return
          }
          setError(null)
          const { total, rows } = result.data
          setData((prev) =>
            prev && prev.key === key
              ? { ...prev, total, pages: { ...prev.pages, [page]: rows } }
              : page === 0
                ? { key, total, pages: { 0: rows } }
                : prev
          )
        })
    }
  }, [key, query, visible.start, visible.end, data])

  return {
    total: data?.total ?? 0,
    getRow: (index) => data?.pages[Math.floor(index / PAGE_SIZE)]?.[index % PAGE_SIZE],
    loading: data?.key !== key,
    error
  }
}
