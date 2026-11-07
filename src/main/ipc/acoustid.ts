import { lookupTrackWithAcoustId } from '../acoustid'
import { handle } from './handle'

export function registerAcoustIdIpc(): void {
  handle('acoustid:lookup', async (_event, filePath: string) => {
    try {
      const lookup = await lookupTrackWithAcoustId(filePath)
      console.log(`[acoustid] Consulta exitosa para ${filePath}:`, lookup)
      return lookup
    } catch (error) {
      console.error(
        `[acoustid] Consulta fallida para ${filePath}:`,
        error instanceof Error ? error.message : error
      )
      throw error
    }
  })
}
