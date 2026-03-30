import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer, WebSocket } from 'ws'
import { PluginManager } from './plugins/PluginManager'
import { ActionExecutor } from './actions/ActionExecutor'
import { StateManager } from './ws/StateManager'
import { ProfileStore } from './ProfileStore'
import { PackInstaller } from './PackInstaller'
import { setupAutoUpdater } from './updater'
import { loadConfig, saveConfig } from './config'
import { log } from './logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ── Globals ────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let wss: WebSocketServer | null = null
const clients = new Set<WebSocket>()

const config = loadConfig(__dirname)
const profileStore = new ProfileStore(config.dataDir)
const stateManager = new StateManager()
const pluginManager = new PluginManager(config, stateManager)
const actionExecutor = new ActionExecutor(pluginManager, stateManager)
const packInstaller = new PackInstaller(config.userPacksDir)

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await pluginManager.loadAll()
  autoAddMediaButtons()
  startWebSocketServer()
  createWindow()
  createTray()
  if (app.isPackaged) {
    setupAutoUpdater(() => mainWindow)
  }
})

// ── Auto-add media pack buttons na výchozí profil ─────────────────────────
function autoAddMediaButtons() {
  const profiles = profileStore.getAllProfiles()
  const defaultProfile = profiles.find(p => p.id === 'default') ?? profiles[0]
  if (!defaultProfile) return

  // Zkontroluj jestli už media tlačítka jsou
  const hasMedia = defaultProfile.buttons.some((b: any) => b.buttonId?.startsWith('media.'))
  if (hasMedia) return

  log('Auto-adding media pack buttons to default profile')

  const mediaButtons = [
    { id: 'media.prev-auto',       buttonId: 'media.prev',       size: '1x1', gridX: 0, gridY: 0 },
    { id: 'media.play_pause-auto', buttonId: 'media.play_pause', size: '1x1', gridX: 1, gridY: 0 },
    { id: 'media.next-auto',       buttonId: 'media.next',       size: '1x1', gridX: 2, gridY: 0 },
    { id: 'media.volume_up-auto',  buttonId: 'system.volume_up', size: '1x1', gridX: 3, gridY: 0 },
    { id: 'media.mute-auto',       buttonId: 'system.mute_toggle', size: '1x1', gridX: 4, gridY: 0 },
  ]

  profileStore.updateProfile(defaultProfile.id, {
    buttons: [...defaultProfile.buttons, ...mediaButtons],
  })
}

app.on('window-all-closed', () => {
  // Keep running in tray on all platforms
  if (mainWindow) mainWindow = null
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})

// ── Main window ────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'OpenDeck',
    backgroundColor: '#0a0a0a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    e.preventDefault()
    mainWindow?.hide()
  })
}

// ── System tray ────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = join(__dirname, '../../assets/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('OpenDeck')

  const updateMenu = () => {
    const connected = clients.size
    tray!.setContextMenu(Menu.buildFromTemplate([
      { label: `OpenDeck — ${connected} klient${connected === 1 ? '' : 'ů'}`, enabled: false },
      { type: 'separator' },
      { label: 'Otevřít', click: () => { if (mainWindow) mainWindow.show(); else createWindow() } },
      { type: 'separator' },
      { label: 'Ukončit', click: () => { app.exit(0) } },
    ]))
  }

  updateMenu()
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); else createWindow() })

  // Update tray menu when clients connect/disconnect
  stateManager.onClientChange = updateMenu
}

// ── WebSocket server ───────────────────────────────────────────────────────
function startWebSocketServer() {
  wss = new WebSocketServer({ port: config.port })
  log(`WebSocket server started on port ${config.port}`)

  wss.on('connection', (ws, req) => {
    const clientId = req.socket.remoteAddress ?? 'unknown'
    log(`Client connected: ${clientId}`)
    clients.add(ws)

    // Push full state snapshot
    ws.send(JSON.stringify({
      type: 'state_snapshot',
      profiles: profileStore.getAllProfiles(),
      activeProfile: profileStore.getActiveProfileId(),
      buttonStates: stateManager.getAllStates(),
    }))

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        await handleWsMessage(ws, msg)
      } catch (e: any) {
        log(`WS parse error: ${e.message}`)
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      log(`Client disconnected: ${clientId}`)
    })

    // Subscribe to state changes
    const unsub = stateManager.subscribe((event) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event))
      }
    })
    ws.on('close', unsub)
  })
}

async function handleWsMessage(ws: WebSocket, msg: any) {
  switch (msg.type) {
    case 'button_press':
      await actionExecutor.execute(msg.buttonId, msg.payload ?? {})
      break
    case 'button_hold':
      await actionExecutor.executeHold(msg.buttonId, msg.payload ?? {})
      break
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      break
  }
}

// Broadcast to all connected Android clients
function broadcast(msg: object) {
  const data = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data)
  }
}

// ── IPC — Renderer ↔ Main ──────────────────────────────────────────────────

// Profiles
ipcMain.handle('profiles:getAll', () => profileStore.getAllProfiles())
ipcMain.handle('profiles:getActive', () => profileStore.getActiveProfileId())
ipcMain.handle('profiles:create', (_, profile) => {
  profileStore.createProfile(profile)
  broadcast({ type: 'profiles_updated', profiles: profileStore.getAllProfiles() })
})
ipcMain.handle('profiles:update', (_, id, patch) => {
  profileStore.updateProfile(id, patch)
  broadcast({ type: 'profiles_updated', profiles: profileStore.getAllProfiles() })
})
ipcMain.handle('profiles:delete', (_, id) => {
  profileStore.deleteProfile(id)
  broadcast({ type: 'profiles_updated', profiles: profileStore.getAllProfiles() })
})
ipcMain.handle('profiles:setActive', (_, id) => {
  profileStore.setActiveProfile(id)
  broadcast({ type: 'active_profile_changed', profileId: id })
})

// Packs
ipcMain.handle('packs:getAll', () => pluginManager.getPacksMeta())

// Button states (live)
ipcMain.handle('states:getAll', () => stateManager.getAllStates())

// Config
ipcMain.handle('config:get', () => config)
ipcMain.handle('config:save', (_, patch) => {
  Object.assign(config, patch)
  saveConfig(config)
})

// Connection info
ipcMain.handle('connection:getClients', () => clients.size)

// Push state changes to renderer too
stateManager.subscribe((event) => {
  mainWindow?.webContents.send('state:update', event)
})

// ── Marketplace IPC ─────────────────────────────────────────────────────

ipcMain.handle('marketplace:getRegistry', async () => {
  return packInstaller.getRegistry()
})

ipcMain.handle('marketplace:fetchUrl', async (_, url: string) => {
  return packInstaller.fetchFromUrl(url)
})

ipcMain.handle('marketplace:install', async (event, pack) => {
  const result = await packInstaller.install(pack, (pct) => {
    event.sender.send('marketplace:progress', { packId: pack.id, pct })
  })
  if (result.ok) {
    // Znovu načti všechny packs (built-in + uživatelské)
    await pluginManager.loadAll()
    // Pošli aktualizovaný seznam do rendereru
    const updatedPacks = pluginManager.getPacksMeta()
    mainWindow?.webContents.send('packs:updated', updatedPacks)
    // Broadcastuj i na Android klienty
    broadcast({ type: 'packs_list', packs: updatedPacks })
  }
  return result
})

ipcMain.handle('marketplace:uninstall', async (_, packName: string) => {
  const result = packInstaller.uninstall(packName)
  if (result.ok) {
    // Restart plugin loaderu pro nové packs
    await pluginManager.loadAll()
    mainWindow?.webContents.send('packs:updated', pluginManager.getPacksMeta())
  }
  return result
})

ipcMain.handle('marketplace:getInstalled', () => {
  const { readdirSync, existsSync } = require('fs')
  if (!existsSync(config.userPacksDir)) return []
  return readdirSync(config.userPacksDir, { withFileTypes: true })
    .filter((e: any) => e.isDirectory())
    .map((e: any) => e.name)
})
