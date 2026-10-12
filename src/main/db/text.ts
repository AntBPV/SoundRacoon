/**
 * Minúsculas y sin tildes: "Canción" → "cancion", "Niño" → "nino".
 *
 * SQLite solo ignora mayúsculas en letras ASCII (LIKE no encuentra "É" con "é") y
 * ordena las tildes al final del alfabeto. Con esta función, registrada en la base
 * de datos como `fold()`, la búsqueda y el orden se comportan como esperaría
 * una persona que escribe en español.
 */
/**
 * Nombre del archivo sin su carpeta, para rutas de Windows (\) y de otros sistemas (/).
 * Debe coincidir con `fileName` de la interfaz (renderer/src/lib/format.ts): el orden por
 * título de las pistas sin tags tiene que seguir lo que el usuario ve en pantalla.
 */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

export function foldText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
