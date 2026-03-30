import { PluginManager } from '../plugins/PluginManager'
import { StateManager } from '../ws/StateManager'
import { log } from '../logger'

export class ActionExecutor {
  constructor(
    private plugins: PluginManager,
    private state: StateManager
  ) {}

  async execute(buttonId: string, payload: Record<string, any> = {}) {
    const handler = this.plugins.getHandler(buttonId)
    if (!handler) { log(`No handler for: ${buttonId}`); return }
    const [packId] = buttonId.split('.')
    const ctx = this._ctx(packId)
    try { await handler.onPress(payload, ctx) } catch (e: any) {
      log(`Error in ${buttonId}: ${e.message}`)
    }
  }

  async executeHold(buttonId: string, payload: Record<string, any> = {}) {
    const handler = this.plugins.getHandler(buttonId)
    if (!handler?.onHold) return
    const [packId] = buttonId.split('.')
    try { await handler.onHold(payload, this._ctx(packId)) } catch {}
  }

  private _ctx(packId: string) {
    return {
      setState: (id: string, s: any) => this.state.updateButton(`${packId}.${id}`, s),
      getState: (id: string) => this.state.getButton(`${packId}.${id}`),
      log: (msg: string) => log(`[${packId}] ${msg}`),
    }
  }
}
