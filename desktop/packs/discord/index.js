/**
 * OpenDeck — Discord Pack
 *
 * Controls Discord via its local RPC IPC socket.
 * No API key required — connects to the running Discord app.
 *
 * Requires: npm install discord-rpc
 */

let Client;
let rpcClient = null;
let connected = false;
let isMuted = false;
let isDeafened = false;
let packCtx;

const DISCORD_CLIENT_ID = '207646673902501888'; // Discord's own client ID for RPC

async function loadDiscordRPC() {
  try {
    const mod = await import('discord-rpc');
    Client = mod.Client ?? mod.default?.Client;
    return !!Client;
  } catch {
    return false;
  }
}

async function connect() {
  const loaded = await loadDiscordRPC();
  if (!loaded) {
    packCtx?.log('discord-rpc not installed. Run: npm install discord-rpc in agent directory');
    return;
  }

  rpcClient = new Client({ transport: 'ipc' });

  rpcClient.on('ready', async () => {
    connected = true;
    packCtx?.log('Connected to Discord IPC');

    try {
      // Subscribe to voice state changes
      await rpcClient.subscribe('VOICE_SETTINGS_UPDATE', {});
      rpcClient.on('VOICE_SETTINGS_UPDATE', (data) => {
        isMuted = data.mute ?? isMuted;
        isDeafened = data.deaf ?? isDeafened;
        packCtx?.setState('mute', {
          active: isMuted,
          color: isMuted ? '#e74c3c' : undefined,
          label: isMuted ? 'Unmute' : 'Mute',
          icon: isMuted ? 'mic-off' : 'mic',
        });
        packCtx?.setState('deafen', {
          active: isDeafened,
          color: isDeafened ? '#e74c3c' : undefined,
          label: isDeafened ? 'Undeafen' : 'Deafen',
        });
      });

      // Get initial voice settings
      const settings = await rpcClient.getVoiceSettings();
      isMuted = settings.mute ?? false;
      isDeafened = settings.deaf ?? false;

      packCtx?.setState('mute', {
        active: isMuted,
        color: isMuted ? '#e74c3c' : undefined,
        label: isMuted ? 'Unmute' : 'Mute',
      });
      packCtx?.setState('deafen', {
        active: isDeafened,
        color: isDeafened ? '#e74c3c' : undefined,
        label: isDeafened ? 'Undeafen' : 'Deafen',
      });
    } catch (e) {
      packCtx?.log(`Error subscribing to voice events: ${e.message}`);
    }
  });

  rpcClient.on('disconnected', () => {
    connected = false;
    packCtx?.log('Discord disconnected, retrying in 10s...');
    setTimeout(connect, 10000);
  });

  try {
    await rpcClient.login({ clientId: DISCORD_CLIENT_ID });
  } catch (e) {
    connected = false;
    packCtx?.log(`Discord IPC connection failed: ${e.message}. Is Discord running?`);
    setTimeout(connect, 10000);
  }
}

module.exports = {
  async setup(context) {
    packCtx = context;
    context.log('Discord pack loaded');
    await connect();
  },

  handlers: {
    mute: {
      async onPress(payload, context) {
        if (!connected || !rpcClient) {
          context.setState('mute', { label: 'No Discord', color: '#e67e22' });
          return;
        }
        try {
          isMuted = !isMuted;
          await rpcClient.setVoiceSettings({ mute: isMuted });
          // State will be updated via VOICE_SETTINGS_UPDATE event
        } catch (e) {
          context.log(`Error toggling mute: ${e.message}`);
        }
      }
    },

    deafen: {
      async onPress(payload, context) {
        if (!connected || !rpcClient) return;
        try {
          isDeafened = !isDeafened;
          await rpcClient.setVoiceSettings({ deaf: isDeafened });
        } catch (e) {
          context.log(`Error toggling deafen: ${e.message}`);
        }
      }
    },

    push_to_talk: {
      async onPress(payload, context) {
        // Hold = start talking, release = stop
        // This is handled via onHold/onRelease
        if (!connected || !rpcClient) return;
        try {
          await rpcClient.setVoiceSettings({ mute: false });
        } catch (e) {
          context.log(`Error: ${e.message}`);
        }
      },

      async onHold(payload, context) {
        if (!connected || !rpcClient) return;
        context.setState('push_to_talk', { active: true, color: '#27ae60', label: 'Talking' });
        try {
          await rpcClient.setVoiceSettings({ mute: false });
        } catch (e) {
          context.log(`PTT error: ${e.message}`);
        }
      },

      async onRelease(payload, context) {
        if (!connected || !rpcClient) return;
        context.setState('push_to_talk', { active: false, color: undefined, label: 'Talk' });
        try {
          await rpcClient.setVoiceSettings({ mute: true });
        } catch (e) {
          context.log(`PTT release error: ${e.message}`);
        }
      }
    },
  }
};
