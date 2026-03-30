/**
 * OpenDeck — PackInstaller
 *
 * Vyhledává GitHub repozitáře s tagem "opendeck-pack",
 * načítá pack.json přímo z GitHubu (přesná tlačítka, ikony, verze)
 * a instaluje/aktualizuje packs stažením ZIP.
 */

import { createWriteStream, existsSync, mkdirSync, rmSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { log } from './logger'

const fetchFn: typeof fetch = globalThis.fetch

export interface RemoteButtonDef {
  id: string
  label: string
  icon?: string           // lucide icon name
  logoUrl?: string        // URL k obrázku/SVG logu (z GitHubu raw)
  color?: string
  defaultSize?: string
  hasHold?: boolean
  configSchema?: Record<string, any>
}

export interface MarketplacePack {
  id: string              // GitHub full name: "author/repo"
  name: string
  description: string
  author: string
  stars: number
  url: string
  zipUrl: string
  defaultBranch: string
  rawBase: string         // base URL pro raw soubory: https://raw.githubusercontent.com/...
  version: string         // z pack.json na GitHubu
  installedVersion: string | null
  updateAvailable: boolean
  buttons: RemoteButtonDef[]
}

export class PackInstaller {
  constructor(private userPacksDir: string) {
    if (!existsSync(userPacksDir)) {
      mkdirSync(userPacksDir, { recursive: true })
    }
  }

  // ── GitHub search + načtení pack.json ─────────────────────────────────

  async search(query: string = ''): Promise<MarketplacePack[]> {
    const q = encodeURIComponent(`topic:opendeck-pack ${query}`.trim())
    const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=30`

    let repos: any[] = []
    try {
      const res = await fetchFn(url, {
        headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'OpenDeck-App' },
      })
      if (!res.ok) { log(`GitHub search failed: ${res.status}`); return [] }
      const data: any = await res.json()
      repos = data.items ?? []
    } catch (e: any) {
      log(`GitHub search error: ${e.message}`)
      return []
    }

    // Načti pack.json paralelně pro každý repozitář
    const results = await Promise.all(repos.map(repo => this._enrichRepo(repo)))
    return results.filter((p): p is MarketplacePack => p !== null)
  }

  /** Načte pack.json z GitHubu a obohatí metadata repozitáře */
  private async _enrichRepo(repo: any): Promise<MarketplacePack | null> {
    const rawBase = `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}`
    const packJsonUrl = `${rawBase}/pack.json`

    let packJson: any = {}
    try {
      const res = await fetchFn(packJsonUrl, { headers: { 'User-Agent': 'OpenDeck-App' } })
      if (res.ok) packJson = await res.json()
    } catch { /* pack.json neexistuje nebo je nečitelný */ }

    const installedVersion = this._getInstalledVersion(repo.name)
    const remoteVersion = packJson.version ?? '0.0.0'

    return {
      id: repo.full_name,
      name: packJson.name ?? repo.name,
      description: packJson.description ?? repo.description ?? '',
      author: repo.owner?.login ?? '',
      stars: repo.stargazers_count ?? 0,
      url: repo.html_url,
      zipUrl: `${repo.html_url}/archive/refs/heads/${repo.default_branch}.zip`,
      defaultBranch: repo.default_branch,
      rawBase,
      version: remoteVersion,
      installedVersion,
      updateAvailable: installedVersion !== null && installedVersion !== remoteVersion,
      buttons: (packJson.buttons ?? []).map((btn: any) => ({
        ...btn,
        // Pokud logoUrl je relativní cesta, převeď na absolutní raw URL
        logoUrl: btn.logoUrl
          ? (btn.logoUrl.startsWith('http') ? btn.logoUrl : `${rawBase}/${btn.logoUrl}`)
          : undefined,
      })),
    }
  }

  // ── Install / Update ──────────────────────────────────────────────────

  async install(
    pack: MarketplacePack,
    onProgress?: (pct: number) => void
  ): Promise<{ ok: boolean; error?: string }> {
    log(`Installing/updating pack: ${pack.id}`)

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
      require('fs').writeFileSync(tmpZip, zipBuffer)

      onProgress?.(85)

      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)
      const platform = process.platform

      const destDir = join(this.userPacksDir, pack.name)
      if (existsSync(destDir)) rmSync(destDir, { recursive: true })
      mkdirSync(destDir, { recursive: true })

      // Rozbal ZIP
      const tmpExtract = join(this.userPacksDir, `__extract_${pack.name}`)
      if (existsSync(tmpExtract)) rmSync(tmpExtract, { recursive: true })
      mkdirSync(tmpExtract)

      if (platform === 'win32') {
        await execAsync(`powershell -NoProfile -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpExtract}' -Force"`)
      } else {
        await execAsync(`unzip -o "${tmpZip}" -d "${tmpExtract}"`)
      }

      // GitHub ZIP vytváří podsložku repo-branch/
      // Přesuň obsah té složky do destDir
      const entries = readdirSync(tmpExtract)
      const subDir = entries.length === 1 ? join(tmpExtract, entries[0]) : tmpExtract

      if (platform === 'win32') {
        await execAsync(`xcopy "${subDir}\\*" "${destDir}\\" /E /I /Y`)
      } else {
        await execAsync(`cp -r "${subDir}/." "${destDir}/"`)
      }

      rmSync(tmpZip, { force: true })
      rmSync(tmpExtract, { recursive: true, force: true })

      onProgress?.(100)
      log(`Pack installed: ${pack.name} v${pack.version}`)
      return { ok: true }
    } catch (e: any) {
      log(`Install error: ${e.message}`)
      return { ok: false, error: e.message }
    }
  }

  // ── Uninstall ──────────────────────────────────────────────────────────

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

  // ── Helpers ────────────────────────────────────────────────────────────

  private _getInstalledVersion(packName: string): string | null {
    const manifestPath = join(this.userPacksDir, packName, 'pack.json')
    if (!existsSync(manifestPath)) return null
    try {
      const meta = JSON.parse(readFileSync(manifestPath, 'utf8'))
      return meta.version ?? '0.0.0'
    } catch { return null }
  }

  getInstalledNames(): string[] {
    try {
      return readdirSync(this.userPacksDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name)
    } catch { return [] }
  }
}
