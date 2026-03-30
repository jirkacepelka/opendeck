/**
 * OpenDeck — Global State (Zustand)
 */

import { create } from 'zustand';
import type {
  Profile,
  ButtonState,
  ButtonLayout,
  ButtonSize,
  AgentConnection,
  PackMeta,
  ConnectionStatus,
} from '../types';

interface AppState {
  // Connection
  connection: AgentConnection;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  updateConnection: (partial: Partial<AgentConnection>) => void;

  // Profiles
  profiles: Profile[];
  activeProfileId: string;
  setActiveProfile: (id: string) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;

  // Button layouts (user-configured)
  addButton: (profileId: string, button: ButtonLayout) => void;
  updateButton: (profileId: string, buttonId: string, patch: Partial<ButtonLayout>) => void;
  removeButton: (profileId: string, layoutId: string) => void;
  moveButton: (profileId: string, layoutId: string, x: number, y: number) => void;

  // Button states (live from agent)
  buttonStates: Record<string, ButtonState>; // key: buttonId
  updateButtonState: (buttonId: string, state: ButtonState) => void;
  applyStateSnapshot: (snapshot: Record<string, Record<string, ButtonState>>) => void;

  // Packs
  packs: PackMeta[];
  setPacks: (packs: PackMeta[]) => void;

  // Editor mode
  editMode: boolean;
  toggleEditMode: () => void;
}

const DEFAULT_PROFILE: Profile = {
  id: 'default',
  name: 'Main',
  icon: 'layout-grid',
  gridCols: 5,
  gridRows: 4,
  buttons: [],
};

export const useStore = create<AppState>((set, get) => ({
  // Connection
  connection: {
    host: '192.168.1.100',
    port: 9001,
    status: 'disconnected',
  },

  setConnectionStatus: (status, error) =>
    set((s) => ({
      connection: { ...s.connection, status, lastError: error },
    })),

  updateConnection: (partial) =>
    set((s) => ({ connection: { ...s.connection, ...partial } })),

  // Profiles
  profiles: [DEFAULT_PROFILE],
  activeProfileId: 'default',

  setActiveProfile: (id) => set({ activeProfileId: id }),

  addProfile: (profile) =>
    set((s) => ({ profiles: [...s.profiles, profile] })),

  updateProfile: (id, patch) =>
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  deleteProfile: (id) =>
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== id),
      activeProfileId: s.activeProfileId === id ? s.profiles[0]?.id ?? 'default' : s.activeProfileId,
    })),

  // Button layout
  addButton: (profileId, button) =>
    set((s) => ({
      profiles: s.profiles.map((p) =>
        p.id === profileId ? { ...p, buttons: [...p.buttons, button] } : p
      ),
    })),

  updateButton: (profileId, layoutId, patch) =>
    set((s) => ({
      profiles: s.profiles.map((p) =>
        p.id === profileId
          ? {
              ...p,
              buttons: p.buttons.map((b) =>
                b.id === layoutId ? { ...b, ...patch } : b
              ),
            }
          : p
      ),
    })),

  removeButton: (profileId, layoutId) =>
    set((s) => ({
      profiles: s.profiles.map((p) =>
        p.id === profileId
          ? { ...p, buttons: p.buttons.filter((b) => b.id !== layoutId) }
          : p
      ),
    })),

  moveButton: (profileId, layoutId, x, y) =>
    set((s) => ({
      profiles: s.profiles.map((p) =>
        p.id === profileId
          ? {
              ...p,
              buttons: p.buttons.map((b) =>
                b.id === layoutId ? { ...b, gridX: x, gridY: y } : b
              ),
            }
          : p
      ),
    })),

  // Live button states
  buttonStates: {},

  updateButtonState: (buttonId, state) =>
    set((s) => ({
      buttonStates: { ...s.buttonStates, [buttonId]: state },
    })),

  applyStateSnapshot: (snapshot) => {
    const flat: Record<string, ButtonState> = {};
    for (const [, buttons] of Object.entries(snapshot)) {
      for (const [buttonId, state] of Object.entries(buttons)) {
        flat[buttonId] = state;
      }
    }
    set({ buttonStates: flat });
  },

  // Packs
  packs: [],
  setPacks: (packs) => set({ packs }),

  // Editor
  editMode: false,
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
}));
