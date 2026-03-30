/**
 * OpenDeck Agent — Configuration loader
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

// __dirname equivalent for ESM — works correctly on Windows too
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(homedir(), '.opendeck');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const PACKS_DIR = join(CONFIG_DIR, 'packs');

// Built-in packs sit next to src/ in the agent root
const BUILTIN_PACKS_DIR = join(__dirname, '..', 'packs');

const DEFAULTS = {
  port: 9001,
  packsDir: PACKS_DIR,
  builtinPacksDir: BUILTIN_PACKS_DIR,
  logLevel: 'info',
};

export function loadConfig() {
  // Ensure dirs exist
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(PACKS_DIR)) {
    mkdirSync(PACKS_DIR, { recursive: true });
  }

  // Write default config if missing
  if (!existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2));
    return { ...DEFAULTS };
  }

  try {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    // Always use computed builtinPacksDir — never read it from config file
    return { ...DEFAULTS, ...raw, builtinPacksDir: BUILTIN_PACKS_DIR };
  } catch {
    console.warn('⚠️  Could not parse config.json, using defaults');
    return { ...DEFAULTS };
  }
}
