import { readdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { StateManager } from '../ws/StateManager'
import { AppConfig } from '../config'
import { log } from '../logger'

export interface ButtonDef {
  id: string
  label: string
  icon?: string
  color?: string
  defaultSize?: string
  hasHold?: boolean
  configSchema?: Record<string, any>
}

export interface PackMeta {
  id: string
  name: string
  version: string
  description: string
  author: string
  builtin: boolean
  buttons: ButtonDef[]
}

interface LoadedPack {
  meta: PackMeta
  handlers: Record<string, any>
  builtin: boolean
}

export class PluginManager {
  private _packs = new Map<string, LoadedPack>()

  constructor(
    private config: AppConfig,
    private stateManager: StateManager
  ) {}

  async loadAll() {
    await this._loadFromDir(this.config.builtinPacksDir, true)
    if (existsSync(this.config.userPacksDir)) {
      await this._loadFromDir(this.config.userPacksDir, false)
    }
  }

  private async _loadFromDir(dir: string, builtin: boolean) {
    if (!existsSync(dir)) {
      log(`Packs dir not found: ${dir}`)
      return
    }
    let entries: any[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch { return }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      await this._loadPack(join(dir, entry.name), builtin)
    }
  }

  private async _loadPack(packDir: string, builtin: boolean) {
    const manifestPath = join(packDir, 'pack.json')
    const indexPath = join(packDir, 'index.js')
    if (!existsSync(manifestPath) || !existsSync(indexPath)) return

    let meta: any
    try {
      meta = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch (e: any) {
      log(`Bad pack.json in ${packDir}: ${e.message}`)
      return
    }

    try {
      const mod = await import(pathToFileURL(indexPath).href)
      const pack = mod.default ?? mod

      const ctx = this._buildContext(meta.id)
      if (typeof pack.setup === 'function') await pack.setup(ctx)

      this._packs.set(meta.id, {
        meta: { ...meta, builtin },
        handlers: pack.handlers ?? {},
        builtin,
      })

      log(`Loaded pack: ${meta.id} (${Object.keys(pack.handlers ?? {}).length} buttons)`)
    } catch (e: any) {
      log(`Failed to load pack ${packDir}: ${e.message}`)
    }
  }

  private _buildContext(packId: string) {
    const sm = this.stateManager
    return {
      setState: (buttonId: string, state: any) =>
        sm.updateButton(`${packId}.${buttonId}`, state),
      getState: (buttonId: string) =>
        sm.getButton(`${packId}.${buttonId}`),
      log: (msg: string) => log(`[${packId}] ${msg}`),
    }
  }

  getHandler(buttonId: string) {
    const [packId, ...rest] = buttonId.split('.')
    const action = rest.join('.')
    const pack = this._packs.get(packId)
    if (!pack) return null
    return pack.handlers[action] ?? null
  }

  getPacksMeta(): PackMeta[] {
    return Array.from(this._packs.values()).map(p => p.meta)
  }
}
