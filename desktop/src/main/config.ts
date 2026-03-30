import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'

export interface AppConfig {
  port: number
  dataDir: string
  builtinPacksDir: string
  userPacksDir: string
  startMinimized: boolean
  startWithSystem: boolean
}

export function loadConfig(appDir: string): AppConfig {
  // userData je už C:\Users\...\AppData\Roaming\opendeck (název z appId)
  // nepřidávej další podsložku
  const dataDir = app.isPackaged
    ? app.getPath('userData')
    : join(homedir(), '.opendeck-dev')

  const userPacksDir = join(dataDir, 'packs')
  const builtinPacksDir = app.isPackaged
    ? join(process.resourcesPath, 'packs')
    : join(appDir, '../../packs')

  const defaults: AppConfig = {
    port: 9001,
    dataDir,
    builtinPacksDir,
    userPacksDir,
    startMinimized: false,
    startWithSystem: false,
  }

  for (const dir of [dataDir, userPacksDir]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }

  const configFile = join(dataDir, 'config.json')
  if (!existsSync(configFile)) {
    writeFileSync(configFile, JSON.stringify(defaults, null, 2))
    return defaults
  }

  try {
    const raw = JSON.parse(readFileSync(configFile, 'utf8'))
    return { ...defaults, ...raw, builtinPacksDir, dataDir, userPacksDir }
  } catch {
    return defaults
  }
}

export function saveConfig(config: AppConfig) {
  const configFile = join(config.dataDir, 'config.json')
  writeFileSync(configFile, JSON.stringify(config, null, 2))
}
