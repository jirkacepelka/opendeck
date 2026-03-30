import { create } from 'zustand'

declare global {
  interface Window {
    opendeck: {
      profiles: {
        getAll: () => Promise<any[]>
        getActive: () => Promise<string>
        create: (p: any) => Promise<void>
        update: (id: string, patch: any) => Promise<void>
        delete: (id: string) => Promise<void>
        setActive: (id: string) => Promise<void>
      }
      packs: { getAll: () => Promise<any[]> }
      states: {
        getAll: () => Promise<Record<string, any>>
        onChange: (cb: (e: any) => void) => () => void
      }
      config: {
        get: () => Promise<any>
        save: (patch: any) => Promise<void>
      }
      connection: { getClients: () => Promise<number> }
      marketplace: {
        search: (query: string) => Promise<any[]>
        install: (pack: any) => Promise<{ ok: boolean; error?: string }>
        uninstall: (packName: string) => Promise<{ ok: boolean; error?: string }>
        getInstalled: () => Promise<string[]>
        onProgress: (cb: (data: { packId: string; pct: number }) => void) => () => void
        onPacksUpdated: (cb: (packs: any[]) => void) => () => void
      }
      updater: {
        check: () => Promise<void>
        download: () => Promise<void>
        install: () => void
        onStatus: (cb: (data: any) => void) => () => void
      }
    }
  }
}

interface AppState {
  profiles: any[]
  activeProfileId: string
  packs: any[]
  buttonStates: Record<string, any>
  config: any
  connectedClients: number

  loadInitialData: () => Promise<void>

  // Profiles
  createProfile: (p: any) => Promise<void>
  updateProfile: (id: string, patch: any) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  setActiveProfile: (id: string) => Promise<void>

  // Buttons within profile
  addButton: (profileId: string, button: any) => Promise<void>
  updateButton: (profileId: string, layoutId: string, patch: any) => Promise<void>
  removeButton: (profileId: string, layoutId: string) => Promise<void>

  saveConfig: (patch: any) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  profiles: [],
  activeProfileId: 'default',
  packs: [],
  buttonStates: {},
  config: {},
  connectedClients: 0,

  loadInitialData: async () => {
    const [profiles, activeProfileId, packs, buttonStates, config, connectedClients] =
      await Promise.all([
        window.opendeck.profiles.getAll(),
        window.opendeck.profiles.getActive(),
        window.opendeck.packs.getAll(),
        window.opendeck.states.getAll(),
        window.opendeck.config.get(),
        window.opendeck.connection.getClients(),
      ])
    set({ profiles, activeProfileId, packs, buttonStates, config, connectedClients })

    // Subscribe to live state changes
    window.opendeck.states.onChange((event) => {
      if (event.type === 'button_state') {
        set(s => ({ buttonStates: { ...s.buttonStates, [event.buttonId]: event.state } }))
      }
    })
  },

  createProfile: async (p) => {
    await window.opendeck.profiles.create(p)
    const profiles = await window.opendeck.profiles.getAll()
    set({ profiles })
  },

  updateProfile: async (id, patch) => {
    await window.opendeck.profiles.update(id, patch)
    const profiles = await window.opendeck.profiles.getAll()
    set({ profiles })
  },

  deleteProfile: async (id) => {
    await window.opendeck.profiles.delete(id)
    const [profiles, activeProfileId] = await Promise.all([
      window.opendeck.profiles.getAll(),
      window.opendeck.profiles.getActive(),
    ])
    set({ profiles, activeProfileId })
  },

  setActiveProfile: async (id) => {
    await window.opendeck.profiles.setActive(id)
    set({ activeProfileId: id })
  },

  addButton: async (profileId, button) => {
    const { profiles } = get()
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return
    const updated = { ...profile, buttons: [...profile.buttons, button] }
    await window.opendeck.profiles.update(profileId, updated)
    const fresh = await window.opendeck.profiles.getAll()
    set({ profiles: fresh })
  },

  updateButton: async (profileId, layoutId, patch) => {
    const { profiles } = get()
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return
    const updated = {
      ...profile,
      buttons: profile.buttons.map((b: any) =>
        b.id === layoutId ? { ...b, ...patch } : b
      ),
    }
    await window.opendeck.profiles.update(profileId, updated)
    const fresh = await window.opendeck.profiles.getAll()
    set({ profiles: fresh })
  },

  removeButton: async (profileId, layoutId) => {
    const { profiles } = get()
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return
    const updated = {
      ...profile,
      buttons: profile.buttons.filter((b: any) => b.id !== layoutId),
    }
    await window.opendeck.profiles.update(profileId, updated)
    const fresh = await window.opendeck.profiles.getAll()
    set({ profiles: fresh })
  },

  saveConfig: async (patch) => {
    await window.opendeck.config.save(patch)
    const config = await window.opendeck.config.get()
    set({ config })
  },
}))
