import { ipcMain, type IpcMainInvokeEvent } from 'electron'

/**
 * Registra un canal IPC. Todo canal responde { ok: true, data } o { ok: false, error },
 * así la interfaz recibe mensajes de error limpios en vez de excepciones de Electron.
 */
export function handle<A, R>(
  channel: string,
  fn: (event: IpcMainInvokeEvent, arg: A) => R | Promise<R>
): void {
  ipcMain.handle(channel, async (event, arg: A) => {
    try {
      return { ok: true, data: await fn(event, arg) }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
