/**
 * OpenDeck — Core Types
 */

// ── Button sizes ──────────────────────────────────────────────────────────

export type ButtonSize =
  | '1x1'
  | '2x1'
  | '1x2'
  | '2x2'
  | '3x1'
  | '4x1'
  | '5x1';

export interface SizeDimensions {
  cols: number;
  rows: number;
}

export const SIZE_DIMENSIONS: Record<ButtonSize, SizeDimensions> = {
  '1x1': { cols: 1, rows: 1 },
  '2x1': { cols: 2, rows: 1 },
  '1x2': { cols: 1, rows: 2 },
  '2x2': { cols: 2, rows: 2 },
  '3x1': { cols: 3, rows: 1 },
  '4x1': { cols: 4, rows: 1 },
  '5x1': { cols: 5, rows: 1 },
};

// ── Button state (from agent) ─────────────────────────────────────────────

export interface ButtonState {
  id: string;
  label?: string;
  sublabel?: string;
  icon?: string;        // lucide icon name
  imageUri?: string;    // base64 or URL
  color?: string;       // hex background
  textColor?: string;
  progress?: number;    // 0-100
  badge?: string | number;
  active?: boolean;
  disabled?: boolean;
}

// ── Layout (user-defined positions) ──────────────────────────────────────

export interface ButtonLayout {
  id: string;           // unique layout id
  buttonId: string;     // e.g. "discord.mute"
  size: ButtonSize;
  gridX: number;        // column (0-based)
  gridY: number;        // row (0-based)
  config?: Record<string, any>;  // pack-specific config (e.g. command, sceneName)
  label?: string;       // user override
  icon?: string;        // user override
  color?: string;       // user override
}

// ── Profile ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  icon?: string;
  gridCols: number;   // default: 5
  gridRows: number;   // default: 4
  buttons: ButtonLayout[];
}

// ── Connection ────────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AgentConnection {
  host: string;
  port: number;
  status: ConnectionStatus;
  lastError?: string;
}

// ── Pack meta (from agent) ────────────────────────────────────────────────

export interface PackMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  builtin: boolean;
  buttons: ButtonDef[];
}

export interface ButtonDef {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  defaultSize?: ButtonSize;
  hasHold?: boolean;
  configSchema?: Record<string, ConfigField>;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  required?: boolean;
  default?: any;
  secret?: boolean;
  options?: string[];
}

// ── WebSocket messages ────────────────────────────────────────────────────

export type AgentMessage =
  | { type: 'state_snapshot'; profiles: Record<string, Record<string, ButtonState>>; activeProfile: string }
  | { type: 'button_state'; profileId: string; buttonId: string; state: ButtonState }
  | { type: 'active_profile_changed'; profileId: string }
  | { type: 'packs_list'; packs: PackMeta[] }
  | { type: 'pong'; timestamp: number };

export type AppMessage =
  | { type: 'button_press'; buttonId: string; payload?: Record<string, any> }
  | { type: 'button_hold'; buttonId: string; payload?: Record<string, any> }
  | { type: 'set_active_profile'; profileId: string }
  | { type: 'get_packs' }
  | { type: 'ping' };
