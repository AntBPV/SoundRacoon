import { app, safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

interface StoredConfig {
  acoustidApiKey?: string
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

async function readConfig(): Promise<StoredConfig> {
  try {
    const content = await fs.readFile(getConfigPath(), 'utf8')
    const config: unknown = JSON.parse(content)
    if (typeof config !== 'object' || config === null) {
      throw new Error('El archivo de configuración no tiene un formato válido.')
    }
    return config as StoredConfig
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return {}
    throw error
  }
}

async function writeConfig(config: StoredConfig): Promise<void> {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`, 'utf8')
}

export async function getAcoustIdApiKey(): Promise<string | undefined> {
  const config = await readConfig()
  if (typeof config.acoustidApiKey !== 'string' || !config.acoustidApiKey) return undefined
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El almacenamiento seguro de credenciales no está disponible.')
  }
  return safeStorage.decryptString(Buffer.from(config.acoustidApiKey, 'base64'))
}

export async function hasAcoustIdApiKey(): Promise<boolean> {
  return (await getAcoustIdApiKey()) !== undefined
}

export async function saveAcoustIdApiKey(apiKey: string): Promise<void> {
  const normalizedKey = apiKey.trim()
  if (!normalizedKey) throw new Error('La clave de AcoustID no puede estar vacía.')
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El almacenamiento seguro de credenciales no está disponible.')
  }
  const config = await readConfig()
  config.acoustidApiKey = safeStorage.encryptString(normalizedKey).toString('base64')
  await writeConfig(config)
}
