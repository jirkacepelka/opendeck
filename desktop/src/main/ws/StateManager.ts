export interface ButtonState {
  id: string
  label?: string
  sublabel?: string
  icon?: string
  color?: string
  textColor?: string
  progress?: number
  badge?: string | number
  active?: boolean
  disabled?: boolean
}

type StateEvent =
  | { type: 'button_state'; buttonId: string; state: ButtonState }
  | { type: 'active_profile_changed'; profileId: string }

type Subscriber = (event: StateEvent) => void

export class StateManager {
  private _states = new Map<string, ButtonState>()
  private _subscribers = new Set<Subscriber>()
  onClientChange?: () => void

  updateButton(buttonId: string, patch: Partial<ButtonState>) {
    const existing = this._states.get(buttonId) ?? {}
    const updated: ButtonState = { ...existing, ...patch, id: buttonId }
    this._states.set(buttonId, updated)
    this._emit({ type: 'button_state', buttonId, state: updated })
  }

  getButton(buttonId: string): ButtonState | null {
    return this._states.get(buttonId) ?? null
  }

  getAllStates(): Record<string, ButtonState> {
    return Object.fromEntries(this._states)
  }

  subscribe(cb: Subscriber): () => void {
    this._subscribers.add(cb)
    return () => this._subscribers.delete(cb)
  }

  private _emit(event: StateEvent) {
    for (const cb of this._subscribers) {
      try { cb(event) } catch {}
    }
  }
}
