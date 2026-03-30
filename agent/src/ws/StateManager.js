/**
 * OpenDeck — StateManager
 *
 * Holds the current state of all buttons across all profiles.
 * Plugins update button state here; the WS layer subscribes and broadcasts changes.
 */

export class StateManager {
  constructor() {
    /** Map<profileId, Map<buttonId, ButtonState>> */
    this._profiles = new Map();
    this._activeProfile = 'default';
    this._subscribers = new Set();

    // Ensure default profile exists
    this._profiles.set('default', new Map());
  }

  // ── Profile management ────────────────────────────────────────────────────

  getProfiles() {
    const result = {};
    for (const [profileId, buttons] of this._profiles) {
      result[profileId] = Object.fromEntries(buttons);
    }
    return result;
  }

  getActiveProfile() {
    return this._activeProfile;
  }

  setActiveProfile(profileId) {
    if (!this._profiles.has(profileId)) {
      this._profiles.set(profileId, new Map());
    }
    this._activeProfile = profileId;
    this._emit({ type: 'active_profile_changed', profileId });
  }

  ensureProfile(profileId) {
    if (!this._profiles.has(profileId)) {
      this._profiles.set(profileId, new Map());
    }
  }

  // ── Button state ──────────────────────────────────────────────────────────

  /**
   * Update a button's state. Merges with existing state.
   * @param {string} buttonId  e.g. "discord.mute"
   * @param {Partial<ButtonState>} patch
   * @param {string} [profileId]
   */
  updateButton(buttonId, patch, profileId = null) {
    const pid = profileId ?? this._activeProfile;
    if (!this._profiles.has(pid)) this._profiles.set(pid, new Map());

    const buttons = this._profiles.get(pid);
    const existing = buttons.get(buttonId) ?? {};
    const updated = { ...existing, ...patch, id: buttonId };
    buttons.set(buttonId, updated);

    this._emit({
      type: 'button_state',
      profileId: pid,
      buttonId,
      state: updated,
    });
  }

  getButton(buttonId, profileId = null) {
    const pid = profileId ?? this._activeProfile;
    return this._profiles.get(pid)?.get(buttonId) ?? null;
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  /** Returns an unsubscribe function */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  _emit(event) {
    for (const cb of this._subscribers) {
      try { cb(event); } catch { /* ignore subscriber errors */ }
    }
  }
}

/**
 * @typedef {Object} ButtonState
 * @property {string} id
 * @property {string} [label]
 * @property {string} [sublabel]
 * @property {string} [icon]        — lucide icon name or base64 image
 * @property {string} [color]       — hex background color
 * @property {string} [textColor]   — hex text color
 * @property {number} [progress]    — 0-100 for progress bar
 * @property {string|number} [badge] — small badge overlay
 * @property {boolean} [active]     — whether button is in "active/on" state
 * @property {boolean} [disabled]
 * @property {'1x1'|'2x1'|'1x2'|'2x2'|'3x1'|'4x1'|'5x1'} [size]
 */
