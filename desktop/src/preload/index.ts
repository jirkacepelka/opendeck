import { contextBridge, ipcRenderer } from 'electron'

// Expose safe API to renderer (React app)
contextBridge.exposeInMainWorld('opendeck', {
  // Profiles
  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:getAll'),
    getActive: () => ipcRenderer.invoke('profiles:getActive'),
    create: (profile: any) => ipcRenderer.invoke('profiles:create', profile),
    update: (id: string, patch: any) => ipcRenderer.invoke('profiles:update', id, patch),
    delete: (id: string) => ipcRenderer.invoke('profiles:delete', id),
    setActive: (id: string) => ipcRenderer.invoke('profiles:setActive', id),
  },

  // Packs
  packs: {
    getAll: () => ipcRenderer.invoke('packs:getAll'),
  },

  // Live button states
  states: {
    getAll: () => ipcRenderer.invoke('states:getAll'),
    onChange: (cb: (event: any) => void) => {
      ipcRenderer.on('state:update', (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('state:update')
    },
  },

  // Config
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    save: (patch: any) => ipcRenderer.invoke('config:save', patch),
  },

  // Connection
  connection: {
    getClients: () => ipcRenderer.invoke('connection:getClients'),
  },

  // Marketplace
  marketplace: {
    search: (query: string) => ipcRenderer.invoke('marketplace:search', query),
    install: (pack: any) => ipcRenderer.invoke('marketplace:install', pack),
    uninstall: (packName: string) => ipcRenderer.invoke('marketplace:uninstall', packName),
    getInstalled: () => ipcRenderer.invoke('marketplace:getInstalled'),
    onProgress: (cb: (data: { packId: string; pct: number }) => void) => {
      ipcRenderer.on('marketplace:progress', (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('marketplace:progress')
    },
    onPacksUpdated: (cb: (packs: any[]) => void) => {
      ipcRenderer.on('packs:updated', (_e, packs) => cb(packs))
      return () => ipcRenderer.removeAllListeners('packs:updated')
    },
  },
})
