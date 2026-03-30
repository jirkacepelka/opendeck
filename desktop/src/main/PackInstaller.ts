/**
 * OpenDeck — PackInstaller
 *
 * Vyhledává GitHub repozitáře s tagem "opendeck-pack"
 * a instaluje je stažením + rozbalením do userPacksDir.
 */

import { createWriteStream, existsSync, mkdirSync, rmSync, readdirSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { log } from './logger'

// Node 18+ má fetch globálně, pro starší verze fallback
const fetchFn: typeof fetch = globalThis.fetch

export interface MarketplacePack {
  id: string            // GitHub repo full name: "author/repo"
  name: string
  description: string
  author: string
  stars: number
  url: string
  zipUrl: string
  installed: boolean
}

export class PackInstaller {
  constructor(private userPacksDir: string) {
    if (!existsSync(userPacksDir)) {
      mkdirSync(userPacksDir, { recursive: true })
    }
  }

  // ── GitHub search ──────────────────────────────────────────────────────

  async search(query: string = ''): Promise<MarketplacePack[]> {
    const q = encodeURIComponent(`topic:opendeck-pack ${query}`.trim())
    const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=30`

    try {
      const res = await fetchFn(url, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'OpenDeck-App',
        },
      })

      if (!res.ok) {
        log(`GitHub search failed: ${res.status}`)
        return []
      }

      const data: any = await res.json()
      const installedIds = this._getInstalledIds()

      return (data.items ?? []).map((repo: any): MarketplacePack => ({
        id: repo.full_name,
        name: repo.name,
        description: repo.description ?? '',
        author: repo.owner?.login ?? '',
        stars: repo.stargazers_count ?? 0,
        url: repo.html_url,
        zipUrl: `${repo.html_url}/archive/refs/heads/${repo.default_branch}.zip`,
        installed: installedIds.has(repo.name),
      }))
    } catch (e: any) {
      log(`GitHub search error: ${e.message}`)
      return []
    }
  }

  // ── Install ────────────────────────────────────────────────────────────

  async install(pack: MarketplacePack, onProgress?: (pct: number) => void): Promise<{ ok: boolean; error?: string }> {
    log(`Installing pack: ${pack.id}`)

    try {
      // Stáhni ZIP
      const res = await fetchFn(pack.zipUrl, { headers: { 'User-Agent': 'OpenDeck-App' } })
      if (!res.ok) throw new Error(`HTTP ${res.status} při stahování`)

      const totalBytes = parseInt(res.headers.get('content-length') ?? '0', 10)
      let downloaded = 0

      const tmpZip = join(this.userPacksDir, `__tmp_${pack.name}.zip`)
      const writer = createWriteStream(tmpZip)

      // Stream s progress reportingem
      const reader = res.body!.getReader()
      const chunks: Buffer[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(Buffer.from(value))
        downloaded += value.length
        if (totalBytes > 0) onProgress?.(Math.round((downloaded / totalBytes) * 80))
      }

      const zipBuffer = Buffer.concat(chunks)
      writer.write(zipBuffer)
      await new Promise<void>((resolve, reject) => {
        writer.end()
        writer.on('finish', resolve)
        writer.on('error', reject)
      })

      onProgress?.(85)

      // Rozbal ZIP (Node 18+ nemá nativní unzip — použij child_process)
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      const destDir = join(this.userPacksDir, pack.name)
      if (existsSync(destDir)) rmSync(destDir, { recursive: true })
      mkdirSync(destDir, { recursive: true })

      const platform = process.platform
      if (platform === 'win32') {
        await execAsync(`powershell -NoProfile -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${this.userPacksDir}' -Force"`)
        // GitHub ZIP vytvoří podsložku repo-branch/, přejmenuj na pack.name
        const entries = readdirSync(this.userPacksDir).filter(e =>
          e.startsWith(pack.name) && e !== pack.name
        )
        if (entries[0]) {
          await execAsync(`move "${join(this.userPacksDir, entries[0])}" "${destDir}"`)
        }
      } else {
        await execAsync(`unzip -o "${tmpZip}" -d "${this.userPacksDir}"`)
        // Přejmenuj rozbalené repo-branch/ na pack.name
        const entries = readdirSync(this.userPacksDir).filter(e =>
          e.startsWith(`${pack.name}-`) || e.startsWith(`${pack.name}_`)
        )
        if (entries[0]) {
          await execAsync(`mv "${join(this.userPacksDir, entries[0])}" "${destDir}"`)
        }
      }

      // Smaž tmp ZIP
      rmSync(tmpZip, { force: true })

      onProgress?.(100)
      log(`Pack installed: ${pack.name} → ${destDir}`)
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

  private _getInstalledIds(): Set<string> {
    try {
      return new Set(readdirSync(this.userPacksDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name))
    } catch { return new Set() }
  }
}
