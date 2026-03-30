/**
 * OpenDeck — Auto Updater
 *
 * Sleduje GitHub Releases a nabídne aktualizaci přímo v appce.
 * Používá electron-updater (součást electron-builder).
 */

import { autoUpdater } from 'electron-updater'
import { ipcMain, BrowserWindow, dialog } from 'electron'
import { log } from './logger'

export function setupAutoUpdater(getWindow: () => BrowserWindow | null) {
  // Neloguj citlivé info
  autoUpdater.logger = {
    info: (msg: any) => log(`[updater] ${msg}`),
    warn: (msg: any) => log(`[updater] WARN: ${msg}`),
    error: (msg: any) => log(`[updater] ERROR: ${msg}`),
    debug: () => {},
    transports: {},
  } as any

  autoUpdater.autoDownload = false        // Neptej se, stáhni jen když uživatel chce
  autoUpdater.autoInstallOnAppQuit = true // Nainstaluj při zavření appky

  // ── Události ─────────────────────────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    log('Checking for update...')
    getWindow()?.webContents.send('updater:status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    log(`Update available: ${info.version}`)
    getWindow()?.webContents.send('updater:status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    log('Already up to date')
    getWindow()?.webContents.send('updater:status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    getWindow()?.webContents.send('updater:status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log(`Update downloaded: ${info.version}`)
    getWindow()?.webContents.send('updater:status', {
      status: 'downloaded',
      version: info.version,
    })
  })

  autoUpdater.on('error', (err) => {
    log(`Updater error: ${err.message}`)
    getWindow()?.webContents.send('updater:status', {
      status: 'error',
      error: err.message,
    })
  })

  // ── IPC handlery ──────────────────────────────────────────────────────────

  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch (e: any) {
      log(`Check failed: ${e.message}`)
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (e: any) {
      log(`Download failed: ${e.message}`)
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // ── Automatická kontrola po spuštění (po 3s) ──────────────────────────────

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Tiché selhání (např. offline)
    })
  }, 3000)
}
