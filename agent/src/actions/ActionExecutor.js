/**
 * OpenDeck — ActionExecutor
 *
 * Routes button presses to the correct pack handler.
 */

import { log } from '../logger.js';

export class ActionExecutor {
  constructor(pluginManager, stateManager) {
    this._plugins = pluginManager;
    this._state = stateManager;
  }

  async execute(buttonId, payload = {}) {
    const handler = this._plugins.getHandler(buttonId);
    if (!handler) {
      log(`⚠️  No handler for button: ${buttonId}`);
      return;
    }

    try {
      const [packId] = buttonId.split('.');
      const context = {
        setState: (bid, state) => this._state.updateButton(`${packId}.${bid}`, state),
        getState: (bid) => this._state.getButton(`${packId}.${bid}`),
        log: (msg) => log(`[${packId}] ${msg}`),
      };

      await handler.onPress(payload, context);
    } catch (err) {
      log(`❌ Error executing ${buttonId}: ${err.message}`);
      console.error(err);
    }
  }

  async executeHold(buttonId, payload = {}) {
    const handler = this._plugins.getHandler(buttonId);
    if (!handler?.onHold) return;

    try {
      const [packId] = buttonId.split('.');
      const context = {
        setState: (bid, state) => this._state.updateButton(`${packId}.${bid}`, state),
        getState: (bid) => this._state.getButton(`${packId}.${bid}`),
        log: (msg) => log(`[${packId}] ${msg}`),
      };

      await handler.onHold(payload, context);
    } catch (err) {
      log(`❌ Error executing hold ${buttonId}: ${err.message}`);
    }
  }
}
