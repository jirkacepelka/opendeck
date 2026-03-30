/**
 * OpenDeck — PluginManager
 *
 * Discovers and loads packs from:
 *   1. Built-in packs (bundled with agent)
 *   2. User packs (~/.opendeck/packs/)
 *
 * Each pack exports a default object with:
 *   - meta: PackMeta
 *   - setup(context): void  — called once on load
 *   - handlers: Map<actionId, ActionHandler>
 */

import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { log } from '../logger.js';

export class PluginManager {
  constructor(config, stateManager) {
    this._config = config;
    this._stateManager = stateManager;
    /** @type {Map<string, LoadedPack>} */
    this._packs = new Map();
  }

  async loadAll() {
    // Load built-in packs
    await this._loadFromDir(this._config.builtinPacksDir, true);
    // Load user packs
    if (existsSync(this._config.packsDir)) {
      await this._loadFromDir(this._config.packsDir, false);
    }
  }

  async _loadFromDir(dir, builtin) {
    if (!existsSync(dir)) return;

    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packDir = join(dir, entry.name);
      await this._loadPack(packDir, builtin);
    }
  }

  async _loadPack(packDir, builtin) {
    const manifestPath = join(packDir, 'pack.json');
    const indexPath = join(packDir, 'index.js');

    if (!existsSync(manifestPath) || !existsSync(indexPath)) {
      log(`⚠️  Skipping ${packDir}: missing pack.json or index.js`);
      return;
    }

    let meta;
    try {
      meta = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      log(`❌ Could not parse pack.json in ${packDir}: ${e.message}`);
      return;
    }

    try {
      const module = await import(pathToFileURL(indexPath).href);
      const pack = module.default ?? module;

      const context = this._buildContext(meta.id);

      if (typeof pack.setup === 'function') {
        await pack.setup(context);
      }

      this._packs.set(meta.id, {
        meta,
        handlers: pack.handlers ?? new Map(),
        builtin,
        dir: packDir,
      });

      log(`📦 Loaded pack: ${meta.id} (${meta.name}) — ${Object.keys(pack.handlers ?? {}).length} buttons`);
    } catch (e) {
      log(`❌ Failed to load pack ${packDir}: ${e.message}`);
      console.error(e);
    }
  }

  /**
   * Build the context object passed to each pack's setup()
   */
  _buildContext(packId) {
    const stateManager = this._stateManager;
    return {
      /** Update a button's visual state */
      setState: (buttonId, state) => {
        stateManager.updateButton(`${packId}.${buttonId}`, state);
      },
      /** Read current button state */
      getState: (buttonId) => {
        return stateManager.getButton(`${packId}.${buttonId}`);
      },
      log: (msg) => log(`[${packId}] ${msg}`),
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getHandler(buttonId) {
    const [packId, ...rest] = buttonId.split('.');
    const action = rest.join('.');
    const pack = this._packs.get(packId);
    if (!pack) return null;
    return pack.handlers[action] ?? pack.handlers[buttonId] ?? null;
  }

  getPacksMeta() {
    return Array.from(this._packs.values()).map(p => ({
      id: p.meta.id,
      name: p.meta.name,
      version: p.meta.version,
      description: p.meta.description ?? '',
      author: p.meta.author ?? '',
      builtin: p.builtin,
      buttons: p.meta.buttons ?? [],
    }));
  }

  getPack(packId) {
    return this._packs.get(packId) ?? null;
  }
}

/**
 * @typedef {Object} PackMeta
 * @property {string} id
 * @property {string} name
 * @property {string} version
 * @property {string} [description]
 * @property {string} [author]
 * @property {ButtonDef[]} buttons
 *
 * @typedef {Object} ButtonDef
 * @property {string} id
 * @property {string} label
 * @property {string} [icon]
 * @property {string} [color]
 * @property {'1x1'|'2x1'|'1x2'|'2x2'|'3x1'|'4x1'|'5x1'} [defaultSize]
 * @property {boolean} [hasHold]
 *
 * @typedef {Object} LoadedPack
 * @property {PackMeta} meta
 * @property {Object} handlers
 * @property {boolean} builtin
 * @property {string} dir
 */
