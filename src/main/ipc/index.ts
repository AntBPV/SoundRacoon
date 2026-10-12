import { registerFolderIpc } from './folders'
import { registerLibraryIpc } from './library'
import { registerScanIpc } from './scan'

/** Registra todos los canales IPC de la aplicación. Se llama una vez al arrancar. */
export function registerIpc(): void {
  registerFolderIpc()
  registerScanIpc()
  registerLibraryIpc()
}
