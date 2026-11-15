import { handle } from './handle'
import { hasAcoustIdApiKey, saveAcoustIdApiKey } from '../config'

export function registerConfigIpc(): void {
  handle('config:acoustid-status', async () => ({ configured: await hasAcoustIdApiKey() }))
  handle('config:save-acoustid-key', async (_event, apiKey: string) => {
    await saveAcoustIdApiKey(apiKey)
  })
}
