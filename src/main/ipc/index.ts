import { registerFolderIpc } from './folders'
import { registerLibraryIpc } from './library'
import { registerScanIpc } from './scan'
import { registerAcoustIdIpc } from './acoustid'
import { registerConfigIpc } from './config'

/** Registra todos los canales IPC de la aplicación. Se llama una vez al arrancar. */
export function registerIpc(): void {
  registerFolderIpc()
  registerScanIpc()
  registerLibraryIpc()
  registerAcoustIdIpc()
  registerConfigIpc()
}
