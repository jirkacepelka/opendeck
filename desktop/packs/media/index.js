/**
 * OpenDeck — Media Pack
 * 
 * Cross-platform media key simulation.
 * Linux: playerctl / xdotool
 * macOS: AppleScript
 * Windows: PowerShell
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const platform = process.platform;

async function sendMediaKey(key) {
  // key: 'play', 'next', 'prev', 'stop'
  if (platform === 'linux') {
    // Try playerctl first (most reliable on Linux)
    const playerctlMap = { play: 'play-pause', next: 'next', prev: 'previous', stop: 'stop' };
    try {
      await execAsync(`playerctl ${playerctlMap[key]}`);
      return;
    } catch {}
    // Fallback: XF86 media keys via xdotool
    const xdotoolMap = { play: 'XF86AudioPlay', next: 'XF86AudioNext', prev: 'XF86AudioPrev', stop: 'XF86AudioStop' };
    await execAsync(`xdotool key ${xdotoolMap[key]}`).catch(() => {});
  } else if (platform === 'darwin') {
    const appleMap = { play: 'play', next: 'next track', prev: 'previous track', stop: 'stop' };
    await execAsync(`osascript -e 'tell application "Spotify" to ${appleMap[key]}'`).catch(async () => {
      await execAsync(`osascript -e 'tell application "Music" to ${appleMap[key]}'`).catch(() => {});
    });
  } else if (platform === 'win32') {
    // VK codes: 179=PlayPause, 176=NextTrack, 177=PrevTrack, 178=Stop
    const vkMap = { play: 179, next: 176, prev: 177, stop: 178 };
    const vk = vkMap[key];
    await execAsync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `(New-Object -ComObject WScript.Shell).SendKeys([char]${vk})"`
    ).catch(() => {});
  }
}

async function getNowPlaying() {
  if (platform === 'linux') {
    try {
      const { stdout } = await execAsync('playerctl metadata --format "{{artist}} — {{title}}"');
      return stdout.trim();
    } catch { return null; }
  } else if (platform === 'darwin') {
    try {
      const { stdout } = await execAsync(`osascript -e 'tell application "Spotify" to (get artist of current track) & " — " & (get name of current track)'`);
      return stdout.trim();
    } catch { return null; }
  }
  return null;
}

export default {
  async setup(ctx) {
    ctx.log('Media pack loaded');

    // Poll now-playing every 5 seconds
    const updateNowPlaying = async () => {
      const np = await getNowPlaying();
      if (np) {
        ctx.setState('play_pause', { sublabel: np });
        ctx.setState('media_row', { sublabel: np });
      }
    };

    updateNowPlaying();
    setInterval(updateNowPlaying, 5000);
  },

  handlers: {
    play_pause: {
      async onPress(payload, ctx) {
        await sendMediaKey('play');
        ctx.setState('play_pause', { active: true });
        setTimeout(() => ctx.setState('play_pause', { active: false }), 200);
      }
    },

    next: {
      async onPress(payload, ctx) {
        await sendMediaKey('next');
        ctx.setState('next', { active: true });
        setTimeout(() => ctx.setState('next', { active: false }), 200);
      }
    },

    prev: {
      async onPress(payload, ctx) {
        await sendMediaKey('prev');
        ctx.setState('prev', { active: true });
        setTimeout(() => ctx.setState('prev', { active: false }), 200);
      }
    },

    media_row: {
      async onPress(payload, ctx) {
        // 3x1 button — acts as play/pause
        await sendMediaKey('play');
      }
    },
  }
};
