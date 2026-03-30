/**
 * OpenDeck — PackInstaller
 *
 * Načítá ověřené packs z registry.json v hlavním repozitáři.
 * Podporuje také ruční zadání libovolného GitHub URL.
 * Instaluje packs stažením ZIP z GitHubu.
 */

import { existsSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { log } from './logger'

const fetchFn: typeof fetch = globalThis.fetch

const REGISTRY_URL = 'https://raw.githubusercontent.com/jirkacepelka/opendeck/main/registry.json'

export interface RemoteButtonDef {
  id: string
  label: string
  icon?: string
  logoUrl?: string
  color?: string
  defaultSize?: string
  hasHold?: boolean
  configSchema?: Record<string, any>
}

export interface MarketplacePack {
  id: string                    // GitHub full name: "author/repo"
  name: string
  description: string
  author: string
  stars: number
  url: string
  zipUrl: string
  defaultBranch: string
  rawBase: string
  version: string
  installedVersion: string | null
  updateAvailable: boolean
  trusted: boolean
  buttons: RemoteButtonDef[]
}

export class PackInstaller {
  constructor(private userPacksDir: string) {
    if (!existsSync(userPacksDir)) {
      mkdirSync(userPacksDir, { recursive: true })
    }
  }

  // ── Registry — ověřené packs ──────────────────────────────────────────

  async getRegistry(): Promise<MarketplacePack[]> {
    let repos: { repo: string; trusted: boolean }[] = []

    try {
      const res = await fetchFn(REGISTRY_URL, { headers: { 'User-Agent': 'OpenDeck-App' } })
      if (res.ok) {
        const data = await res.json() as any
        repos = data.packs ?? []
      }
    } catch (e: any) {
      log(`Registry fetch error: ${e.message}`)
    }

    const results = await Promise.all(
      repos.map(entry => this._fetchPackFromRepo(entry.repo, entry.trusted))
    )
    return results.filter((p): p is MarketplacePack => p !== null)
  }

  // ── Přidání vlastního GitHub URL ──────────────────────────────────────

  async fetchFromUrl(githubUrl: string): Promise<MarketplacePack | null> {
    // Podporované formáty:
    //   https://github.com/author/repo
    //   author/repo
    const match = githubUrl
      .replace('https://github.com/', '')
      .replace('http://github.com/', '')
      .trim()
      .match(/^([\w.-]+)\/([\w.-]+)/)

    if (!match) return null
    const repo = `${match[1]}/${match[2]}`
    return this._fetchPackFromRepo(repo, false)
  }

  // ── Načtení pack.json z GitHub repozitáře ─────────────────────────────

  private async _fetchPackFromRepo(
    fullName: string,
    trusted: boolean
  ): Promise<MarketplacePack | null> {
    // Nejdřív GitHub API pro metadata repozitáře
    let repoMeta: any = {}
    try {
      const res = await fetchFn(
        `https://api.github.com/repos/${fullName}`,
        { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'OpenDeck-App' } }
      )
      if (res.ok) repoMeta = await res.json()
    } catch { /* ignoruj */ }

    const defaultBranch = repoMeta.default_branch ?? 'main'
    const rawBase = `https://raw.githubusercontent.com/${fullName}/${defaultBranch}`

    // Načti pack.json přímo z repozitáře
    let packJson: any = {}
    try {
      const res = await fetchFn(`${rawBase}/pack.json`, { headers: { 'User-Agent': 'OpenDeck-App' } })
      if (res.ok) packJson = await res.json()
    } catch { /* pack.json neexistuje */ }

    const packName = packJson.id ?? fullName.split('/')[1]
    const installedVersion = this._getInstalledVersion(packName)
    const remoteVersion = packJson.version ?? '0.0.0'

    return {
      id: fullName,
      name: packJson.name ?? repoMeta.name ?? packName,
      description: packJson.description ?? repoMeta.description ?? '',
      author: fullName.split('/')[0],
      stars: repoMeta.stargazers_count ?? 0,
      url: `https://github.com/${fullName}`,
      zipUrl: `https://github.com/${fullName}/archive/refs/heads/${defaultBranch}.zip`,
      defaultBranch,
      rawBase,
      version: remoteVersion,
      installedVersion,
      updateAvailable: installedVersion !== null && installedVersion !== remoteVersion,
      trusted,
      buttons: (packJson.buttons ?? []).map((btn: any) => ({
        ...btn,
        logoUrl: btn.logoUrl?.startsWith('http')
          ? btn.logoUrl
          : btn.logoUrl ? `${rawBase}/${btn.logoUrl}` : undefined,
      })),
    }
  }

  // ── Install / Update ──────────────────────────────────────────────────

  async install(
    pack: MarketplacePack,
    onProgress?: (pct: number) => void
  ): Promise<{ ok: boolean; error?: string }> {
    log(`Installing: ${pack.id} v${pack.version}`)
    try {
      onProgress?.(5)

      const res = await fetchFn(pack.zipUrl, { headers: { 'User-Agent': 'OpenDeck-App' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const totalBytes = parseInt(res.headers.get('content-length') ?? '0', 10)
      let downloaded = 0
      const chunks: Buffer[] = []
      const reader = res.body!.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(Buffer.from(value))
        downloaded += value.length
        if (totalBytes > 0) onProgress?.(5 + Math.round((downloaded / totalBytes) * 75))
      }

      onProgress?.(82)

      const zipBuffer = Buffer.concat(chunks)
      const tmpZip = join(this.userPacksDir, `__tmp_${pack.name}.zip`)
      writeFileSync(tmpZip, zipBuffer)

      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      const packName = pack.buttons[0] ? pack.id.split('/')[1] : pack.name.toLowerCase()
      const destDir = join(this.userPacksDir, packName)
      if (existsSync(destDir)) rmSync(destDir, { recursive: true })
      mkdirSync(destDir, { recursive: true })

      const tmpExtract = join(this.userPacksDir, `__extract_${packName}`)
      if (existsSync(tmpExtract)) rmSync(tmpExtract, { recursive: true })
      mkdirSync(tmpExtract)

      if (process.platform === 'win32') {
        await execAsync(`powershell -NoProfile -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpExtract}' -Force"`)
      } else {
        await execAsync(`unzip -o "${tmpZip}" -d "${tmpExtract}"`)
      }

      const entries = readdirSync(tmpExtract)
      const subDir = entries.length === 1 ? join(tmpExtract, entries[0]) : tmpExtract

      if (process.platform === 'win32') {
        await execAsync(`xcopy "${subDir}\\*" "${destDir}\\" /E /I /Y`)
      } else {
        await execAsync(`cp -r "${subDir}/." "${destDir}/"`)
      }

      rmSync(tmpZip, { force: true })
      rmSync(tmpExtract, { recursive: true, force: true })

      onProgress?.(100)
      log(`Installed: ${packName} v${pack.version}`)
      return { ok: true }
    } catch (e: any) {
      log(`Install error: ${e.message}`)
      return { ok: false, error: e.message }
    }
  }

  // ── Uninstall ─────────────────────────────────────────────────────────

  uninstall(packName: string): { ok: boolean; error?: string } {
    const dir = join(this.userPacksDir, packName)
    if (!existsSync(dir)) return { ok: false, error: 'Pack není nainstalován' }
    try {
      rmSync(dir, { recursive: true })
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private _getInstalledVersion(packName: string): string | null {
    const manifestPath = join(this.userPacksDir, packName, 'pack.json')
    if (!existsSync(manifestPath)) return null
    try {
      return JSON.parse(readFileSync(manifestPath, 'utf8')).version ?? '0.0.0'
    } catch { return null }
  }

  getInstalledNames(): string[] {
    try {
      return readdirSync(this.userPacksDir, { withFileTypes: true })
        .filter(e => e.isDirectory()).map(e => e.name)
    } catch { return [] }
  }
}
