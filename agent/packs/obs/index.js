/**
 * OpenDeck — OBS Pack
 *
 * Connects to OBS via obs-websocket v5.
 * Requires: npm install obs-websocket-js (user installs separately or agent auto-installs)
 */

let OBSWebSocket;
let obsClient = null;
let connected = false;
let ctx;

async function loadOBS() {
  try {
    const mod = await import('obs-websocket-js');
    OBSWebSocket = mod.default ?? mod.OBSWebSocket;
    return true;
  } catch {
    return false;
  }
}

async function connect(config) {
  if (!OBSWebSocket) {
    const loaded = await loadOBS();
    if (!loaded) {
      ctx?.log('obs-websocket-js not installed. Run: npm install obs-websocket-js in agent directory');
      return false;
    }
  }

  obsClient = new OBSWebSocket();
  const host = config?.host || 'localhost';
  const port = config?.port || 4455;
  const password = config?.password || '';

  try {
    await obsClient.connect(`ws://${host}:${port}`, password);
    connected = true;
    ctx?.log(`Connected to OBS at ${host}:${port}`);

    // Subscribe to events
    obsClient.on('StreamStateChanged', ({ outputActive }) => {
      ctx?.setState('stream_toggle', {
        active: outputActive,
        label: outputActive ? 'LIVE' : 'Stream',
        color: outputActive ? '#e74c3c' : undefined,
      });
    });

    obsClient.on('RecordStateChanged', ({ outputActive }) => {
      ctx?.setState('record_toggle', {
        active: outputActive,
        label: outputActive ? '⏺ REC' : 'Record',
        color: outputActive ? '#e74c3c' : undefined,
      });
    });

    obsClient.on('CurrentProgramSceneChanged', ({ sceneName }) => {
      ctx?.setState('scene_switch', { sublabel: sceneName });
    });

    obsClient.on('ConnectionClosed', () => {
      connected = false;
      ctx?.log('OBS disconnected, retrying in 5s...');
      setTimeout(() => connect(config), 5000);
    });

    // Initial state sync
    try {
      const { outputActive: streaming } = await obsClient.call('GetStreamStatus');
      ctx?.setState('stream_toggle', {
        active: streaming,
        label: streaming ? 'LIVE' : 'Stream',
        color: streaming ? '#e74c3c' : undefined,
      });

      const { outputActive: recording } = await obsClient.call('GetRecordStatus');
      ctx?.setState('record_toggle', {
        active: recording,
        label: recording ? '⏺ REC' : 'Record',
        color: recording ? '#e74c3c' : undefined,
      });

      const { currentProgramSceneName } = await obsClient.call('GetCurrentProgramScene');
      ctx?.setState('scene_switch', { sublabel: currentProgramSceneName });
    } catch (e) {
      ctx?.log(`Could not get initial state: ${e.message}`);
    }

    return true;
  } catch (e) {
    connected = false;
    ctx?.log(`OBS connection failed: ${e.message}. Retrying in 5s...`);
    setTimeout(() => connect(config), 5000);
    return false;
  }
}

export default {
  async setup(context) {
    ctx = context;
    ctx.log('OBS pack loaded');

    // Read config from ~/.opendeck/config.json
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const { homedir } = await import('os');
    const configPath = join(homedir(), '.opendeck', 'config.json');
    let obsConfig = {};
    if (existsSync(configPath)) {
      try {
        const full = JSON.parse(readFileSync(configPath, 'utf8'));
        obsConfig = full.obs ?? {};
      } catch {}
    }

    await connect(obsConfig);
  },

  handlers: {
    stream_toggle: {
      async onPress(payload, context) {
        if (!connected || !obsClient) {
          context.setState('stream_toggle', { label: 'No OBS', color: '#e67e22' });
          return;
        }
        try {
          await obsClient.call('ToggleStream');
        } catch (e) {
          context.log(`Error: ${e.message}`);
        }
      }
    },

    record_toggle: {
      async onPress(payload, context) {
        if (!connected || !obsClient) return;
        try {
          await obsClient.call('ToggleRecord');
        } catch (e) {
          context.log(`Error: ${e.message}`);
        }
      }
    },

    scene_switch: {
      async onPress(payload, context) {
        if (!connected || !obsClient) return;
        const { sceneName } = payload;
        if (!sceneName) return;
        try {
          await obsClient.call('SetCurrentProgramScene', { sceneName });
          context.setState('scene_switch', { active: true, sublabel: sceneName });
          setTimeout(() => context.setState('scene_switch', { active: false }), 300);
        } catch (e) {
          context.log(`Error switching scene: ${e.message}`);
        }
      }
    },

    mic_mute: {
      async onPress(payload, context) {
        if (!connected || !obsClient) return;
        try {
          const { inputMuted } = await obsClient.call('GetInputMute', { inputName: 'Mic/Aux' });
          await obsClient.call('SetInputMute', { inputName: 'Mic/Aux', inputMuted: !inputMuted });
          context.setState('mic_mute', {
            active: !inputMuted,
            color: !inputMuted ? '#e74c3c' : undefined,
            label: !inputMuted ? 'Mic OFF' : 'Mic',
          });
        } catch (e) {
          context.log(`Error: ${e.message}`);
        }
      }
    },

    desktop_mute: {
      async onPress(payload, context) {
        if (!connected || !obsClient) return;
        try {
          const { inputMuted } = await obsClient.call('GetInputMute', { inputName: 'Desktop Audio' });
          await obsClient.call('SetInputMute', { inputName: 'Desktop Audio', inputMuted: !inputMuted });
          context.setState('desktop_mute', {
            active: !inputMuted,
            color: !inputMuted ? '#e74c3c' : undefined,
            label: !inputMuted ? 'Desktop OFF' : 'Desktop',
          });
        } catch (e) {
          context.log(`Error: ${e.message}`);
        }
      }
    },
  }
};
