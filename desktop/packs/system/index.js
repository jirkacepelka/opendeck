/**
 * OpenDeck — System Pack
 *
 * Systémové akce — bez nativních závislostí (žádný robotjs/nut-js).
 * Windows: PowerShell SendKeys + WScript.Shell
 * Linux:   xdotool / ydotool + pactl
 * macOS:   AppleScript
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import openUrl from 'open';

const execAsync = promisify(exec);
const platform = process.platform; // 'linux' | 'darwin' | 'win32'

// ── Volume ────────────────────────────────────────────────────────────────

async function changeVolume(delta) {
  if (platform === 'linux') {
    await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${delta > 0 ? '+' : ''}${delta}%`);
  } else if (platform === 'darwin') {
    const { stdout } = await execAsync('osascript -e "output volume of (get volume settings)"');
    const current = parseInt(stdout.trim(), 10) || 50;
    const next = Math.max(0, Math.min(100, current + delta));
    await execAsync(`osascript -e "set volume output volume ${next}"`);
  } else if (platform === 'win32') {
    // PowerShell přes WScript.Shell — bez nircmd
    const vkCode = delta > 0 ? 0xAF : 0xAE; // VK_VOLUME_UP / VK_VOLUME_DOWN
    const times = Math.abs(Math.round(delta / 5));
    const keys = Array(times).fill(`[char]${vkCode}`).join(',');
    await execAsync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `$wsh = New-Object -ComObject WScript.Shell; ` +
      `${Array(times).fill(`$wsh.SendKeys([char]${vkCode})`).join('; ')}"`
    ).catch(() => {});
  }
}

async function toggleMute() {
  if (platform === 'linux') {
    await execAsync('pactl set-sink-mute @DEFAULT_SINK@ toggle');
  } else if (platform === 'darwin') {
    await execAsync('osascript -e "set volume output muted not (output muted of (get volume settings))"');
  } else if (platform === 'win32') {
    // VK_VOLUME_MUTE = 0xAD
    await execAsync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `(New-Object -ComObject WScript.Shell).SendKeys([char]173)"`
    ).catch(() => {});
  }
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────
//
// Formát: "ctrl+c", "win+l", "alt+F4", "super+space"
// Windows: PowerShell WScript.Shell.SendKeys
// Linux:   xdotool key (X11) nebo ydotool key (Wayland)
// macOS:   osascript

const WIN_MOD_MAP = {
  ctrl: '^', control: '^',
  alt: '%',
  shift: '+',
  win: '^%+{ESC}', // WScript.Shell nemá přímý Win klíč — použijeme jiný přístup
  super: '', meta: '',
};

// Přeloží "ctrl+alt+t" na WScript.Shell format
function toWshKeys(keys) {
  const parts = keys.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1);

  // Speciální klávesy
  const specialMap = {
    'f1': '{F1}', 'f2': '{F2}', 'f3': '{F3}', 'f4': '{F4}',
    'f5': '{F5}', 'f6': '{F6}', 'f7': '{F7}', 'f8': '{F8}',
    'f9': '{F9}', 'f10': '{F10}', 'f11': '{F11}', 'f12': '{F12}',
    'enter': '{ENTER}', 'esc': '{ESC}', 'escape': '{ESC}',
    'tab': '{TAB}', 'backspace': '{BACKSPACE}', 'delete': '{DELETE}',
    'home': '{HOME}', 'end': '{END}', 'pageup': '{PGUP}', 'pagedown': '{PGDN}',
    'up': '{UP}', 'down': '{DOWN}', 'left': '{LEFT}', 'right': '{RIGHT}',
    'space': ' ', 'insert': '{INSERT}',
  };

  const keyStr = specialMap[key] ?? key;

  let prefix = '';
  for (const mod of mods) {
    if (mod === 'ctrl' || mod === 'control') prefix += '^';
    else if (mod === 'alt') prefix += '%';
    else if (mod === 'shift') prefix += '+';
    // win/super: WScript.Shell nemá přímý modifier — ignorujeme (použij AutoHotkey pro Win klávesy)
  }

  if (mods.includes('win') || mods.includes('super') || mods.includes('meta')) {
    // Win klávesy nejdou přes WScript.Shell spolehlivě
    // Použij PowerShell Add-Type
    return null; // signál pro alternativní metodu
  }

  return `${prefix}${keyStr}`;
}

async function sendHotkeyWindows(keys) {
  const wshKeys = toWshKeys(keys);

  if (wshKeys === null) {
    // Fallback pro Win klávesy — PowerShell .NET SendWait
    const parts = keys.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const mods = parts.slice(0, -1);

    const vkMap = {
      'win': '91', 'super': '91', 'meta': '91',
      'ctrl': '17', 'alt': '18', 'shift': '16',
    };

    const keyVk = parseInt(key, 16) || key.charCodeAt(0);
    const modVks = mods.map(m => vkMap[m]).filter(Boolean);

    const ps = `
Add-Type -AssemblyName System.Windows.Forms;
${modVks.map(v => `[System.Windows.Forms.SendKeys]::SendWait(""); [void][System.Runtime.InteropServices.Marshal]::GetDelegateForFunctionPointer([System.Runtime.InteropServices.Marshal]::GetFunctionPointerForDelegate(0),[System.Type]::GetType(''))` ).join('\n')}
[System.Windows.Forms.SendKeys]::SendWait("{${key.toUpperCase()}}")
`.trim();

    // Jednodušší fallback: keybd_event přes PowerShell
    await execAsync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `Add-Type -AssemblyName System.Windows.Forms; ` +
      `[System.Windows.Forms.SendKeys]::SendWait('${wshKeys ?? key}')"`
    ).catch(() => {});
    return;
  }

  await execAsync(
    `powershell -NoProfile -NonInteractive -Command "` +
    `(New-Object -ComObject WScript.Shell).SendKeys('${wshKeys}')"`
  ).catch((err) => {
    // Fallback: System.Windows.Forms
    return execAsync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `Add-Type -AssemblyName System.Windows.Forms; ` +
      `[System.Windows.Forms.SendKeys]::SendWait('${wshKeys}')"`
    ).catch(() => {});
  });
}

async function sendHotkey(keys) {
  if (platform === 'linux') {
    const xdotoolKeys = keys
      .replace(/super|meta/gi, 'super')
      .replace(/\+/g, '+');
    await execAsync(`xdotool key ${xdotoolKeys}`).catch(async () => {
      // Wayland fallback
      await execAsync(`ydotool key ${xdotoolKeys}`).catch(() => {});
    });
  } else if (platform === 'darwin') {
    const parts = keys.split('+');
    const key = parts[parts.length - 1];
    const mods = parts.slice(0, -1);
    const modStr = mods.map(m => {
      const map = {
        ctrl: 'control', alt: 'option', shift: 'shift',
        super: 'command', meta: 'command', win: 'command',
      };
      return (map[m.toLowerCase()] || m) + ' down';
    }).join(', ');
    const holdStr = modStr ? `using {${modStr}}` : '';
    await execAsync(
      `osascript -e 'tell application "System Events" to keystroke "${key}" ${holdStr}'`
    ).catch(() => {});
  } else if (platform === 'win32') {
    await sendHotkeyWindows(keys);
  }
}

// ── Pack ──────────────────────────────────────────────────────────────────

export default {
  async setup(ctx) {
    ctx.log(`System pack loaded (platform: ${platform})`);
  },

  handlers: {
    run_command: {
      async onPress(payload, ctx) {
        const { command, label } = payload;
        if (!command) {
          ctx.log('run_command: no command configured');
          return;
        }
        ctx.log(`Running: ${command}`);
        try {
          await execAsync(command, { timeout: 15000, shell: true });
          ctx.setState('run_command', {
            label: label || 'Done',
            color: '#27ae60',
            active: true,
          });
          setTimeout(() => ctx.setState('run_command', { active: false, color: undefined }), 800);
        } catch (err) {
          ctx.setState('run_command', { label: 'Error', color: '#e74c3c' });
          ctx.log(`Error: ${err.message}`);
        }
      }
    },

    hotkey: {
      async onPress(payload, ctx) {
        const { keys, label } = payload;
        if (!keys) {
          ctx.log('hotkey: no keys configured');
          return;
        }
        ctx.log(`Sending hotkey: ${keys}`);
        ctx.setState('hotkey', { active: true });
        await sendHotkey(keys);
        setTimeout(() => ctx.setState('hotkey', { active: false }), 200);
      }
    },

    open_url: {
      async onPress(payload, ctx) {
        const { url } = payload;
        if (!url) return;
        ctx.log(`Opening URL: ${url}`);
        await openUrl(url);
        ctx.setState('open_url', { active: true });
        setTimeout(() => ctx.setState('open_url', { active: false }), 300);
      }
    },

    volume_up: {
      async onPress(payload, ctx) {
        await changeVolume(5);
        ctx.setState('volume_up', { active: true });
        setTimeout(() => ctx.setState('volume_up', { active: false }), 150);
      }
    },

    volume_down: {
      async onPress(payload, ctx) {
        await changeVolume(-5);
        ctx.setState('volume_down', { active: true });
        setTimeout(() => ctx.setState('volume_down', { active: false }), 150);
      }
    },

    mute_toggle: {
      async onPress(payload, ctx) {
        await toggleMute();
        const current = ctx.getState('mute_toggle');
        const nowMuted = !(current?.active);
        ctx.setState('mute_toggle', {
          active: nowMuted,
          color: nowMuted ? '#e74c3c' : undefined,
          label: nowMuted ? 'Muted' : 'Mute',
          icon: nowMuted ? 'volume-x' : 'volume-2',
        });
      }
    },
  }
};
