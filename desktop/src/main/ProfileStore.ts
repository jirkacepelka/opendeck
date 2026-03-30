import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface ButtonLayout {
  id: string
  buttonId: string
  size: string
  gridX: number
  gridY: number
  config?: Record<string, any>
  label?: string
  icon?: string
  color?: string
}

export interface Profile {
  id: string
  name: string
  icon?: string
  gridCols: number
  gridRows: number
  buttons: ButtonLayout[]
}

interface Store {
  profiles: Profile[]
  activeProfileId: string
}

const DEFAULT_STORE: Store = {
  profiles: [
    {
      id: 'default',
      name: 'Hlavní',
      icon: 'layout-grid',
      gridCols: 5,
      gridRows: 4,
      buttons: [],
    },
  ],
  activeProfileId: 'default',
}

export class ProfileStore {
  private _file: string
  private _store: Store

  constructor(dataDir: string) {
    this._file = join(dataDir, 'profiles.json')
    this._store = this._load()
  }

  private _load(): Store {
    if (!existsSync(this._file)) return { ...DEFAULT_STORE }
    try {
      return JSON.parse(readFileSync(this._file, 'utf8'))
    } catch {
      return { ...DEFAULT_STORE }
    }
  }

  private _save() {
    writeFileSync(this._file, JSON.stringify(this._store, null, 2))
  }

  getAllProfiles(): Profile[] {
    return this._store.profiles
  }

  getActiveProfileId(): string {
    return this._store.activeProfileId
  }

  setActiveProfile(id: string) {
    this._store.activeProfileId = id
    this._save()
  }

  createProfile(profile: Omit<Profile, 'id'>) {
    const newProfile: Profile = {
      ...profile,
      id: `profile-${Date.now()}`,
      buttons: [],
    }
    this._store.profiles.push(newProfile)
    this._save()
    return newProfile
  }

  updateProfile(id: string, patch: Partial<Profile>) {
    const idx = this._store.profiles.findIndex(p => p.id === id)
    if (idx === -1) return
    this._store.profiles[idx] = { ...this._store.profiles[idx], ...patch }
    this._save()
  }

  deleteProfile(id: string) {
    this._store.profiles = this._store.profiles.filter(p => p.id !== id)
    if (this._store.activeProfileId === id) {
      this._store.activeProfileId = this._store.profiles[0]?.id ?? 'default'
    }
    this._save()
  }
}
