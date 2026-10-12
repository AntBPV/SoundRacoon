/**
 * Escaneo en curso (solo se permite uno a la vez). Lo comparten los canales de
 * escaneo y los de carpetas, que no deben quitar una carpeta mientras se lee.
 */
export const scanState: {
  current: { folderId: number; controller: AbortController } | null
} = { current: null }
