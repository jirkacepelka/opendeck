/**
 * OpenDeck Agent — Main Entry Point
 * Starts the WebSocket server and loads all packs.
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PluginManager } from './plugins/PluginManager.js';
import { ActionExecutor } from './actions/ActionExecutor.js';
import { StateManager } from './ws/StateManager.js';
import { loadConfig } from './config.js';
import { log } from './logger.js';

const config = loadConfig();

// ── HTTP + WebSocket server ─────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: '0.1.0' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server: httpServer });

// ── Core services ───────────────────────────────────────────────────────────
const stateManager = new StateManager();
const pluginManager = new PluginManager(config, stateManager);
const actionExecutor = new ActionExecutor(pluginManager, stateManager);

// Load all packs
await pluginManager.loadAll();

// ── WebSocket connection handler ────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const clientId = req.socket.remoteAddress;
  log(`📱 Client connected: ${clientId}`);

  // Send full state snapshot on connect
  ws.send(JSON.stringify({
    type: 'state_snapshot',
    profiles: stateManager.getProfiles(),
    activeProfile: stateManager.getActiveProfile(),
  }));

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      log(`⚠️  Invalid JSON from ${clientId}`);
      return;
    }
    await handleMessage(ws, msg, clientId);
  });

  ws.on('close', () => {
    log(`📱 Client disconnected: ${clientId}`);
  });

  ws.on('error', (err) => {
    log(`❌ WS error from ${clientId}: ${err.message}`);
  });

  // Subscribe to state changes and push to this client
  const unsubscribe = stateManager.subscribe((event) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(event));
    }
  });

  ws.on('close', unsubscribe);
});

// ── Message router ──────────────────────────────────────────────────────────
async function handleMessage(ws, msg, clientId) {
  log(`→ ${msg.type} from ${clientId}`, msg);

  switch (msg.type) {
    case 'button_press':
      await actionExecutor.execute(msg.buttonId, msg.payload ?? {});
      break;

    case 'button_hold':
      await actionExecutor.executeHold(msg.buttonId, msg.payload ?? {});
      break;

    case 'set_active_profile':
      stateManager.setActiveProfile(msg.profileId);
      break;

    case 'get_packs':
      ws.send(JSON.stringify({
        type: 'packs_list',
        packs: pluginManager.getPacksMeta(),
      }));
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    default:
      log(`⚠️  Unknown message type: ${msg.type}`);
  }
}

// ── Start ───────────────────────────────────────────────────────────────────
httpServer.listen(config.port, '0.0.0.0', () => {
  log(`🚀 OpenDeck Agent running on port ${config.port}`);
  log(`📦 Loaded packs: ${pluginManager.getPacksMeta().map(p => p.id).join(', ')}`);
});
