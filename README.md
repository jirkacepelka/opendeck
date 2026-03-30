# OpenDeck

**Open-source alternativa Stream Deck** pro Windows, macOS a Linux s Android mobilní appkou.

[![Release](https://img.shields.io/github/v/release/opendeck/opendeck)](https://github.com/opendeck/opendeck/releases)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

---

## Stažení

Nejnovější verze vždy na [**GitHub Releases**](https://github.com/opendeck/opendeck/releases):

| Platforma | Soubor |
|-----------|--------|
| **Windows** | `OpenDeck-Setup-x.x.x.exe` |
| **macOS** | `OpenDeck-x.x.x.dmg` |
| **Linux** | `OpenDeck-x.x.x.AppImage` |
| **Android** | `OpenDeck.apk` |

---

## Jak to funguje

```
[Desktop app]  ←──── konfigurace profilů, button packů
      │
   WebSocket (port 9001, Wi-Fi)
      │
[Android app]  ←──── jen zobrazuje grid a odesílá stisky
```

**Desktop app** (Electron) je hlavní centrum:
- Editor profilů a layoutů tlačítek
- Správa button packů (integrace)
- WebSocket server pro připojení telefonu

**Android app** je chytrý remote:
- Zobrazuje grid tlačítek v reálném čase
- Odesílá stisky na desktop
- Žádný editor — vše se konfiguruje na PC

---

## Funkce

- **Variabilní velikosti tlačítek** — 1×1, 2×1, 1×2, 2×2, 3×1, 4×1, 5×1
- **Button packy** — modulární plugin systém pro libovolné integrace
- **Živý stav** — barvy, labely, progress bar, badge se aktualizují v reálném čase
- **Profily** — více sad tlačítek (streaming, editing, meeting, ...)
- **Hold akce** — long press spustí jinou akci než krátký stisk

### Zabudované packs

| Pack | Funkce |
|------|--------|
| **System** | Spouštění příkazů, klávesové zkratky, otevírání URL, hlasitost |
| **OBS Studio** | Toggle stream/record, přepínání scén, mute mikrofonu |
| **Discord** | Mute/deafen, push-to-talk (bez API klíče — přes IPC) |
| **Media** | Play/pause, next, previous track |

---

## Struktura projektu

```
opendeck/
  desktop/          ← Electron desktop app (hlavní aplikace)
    src/
      main/         ← Electron main process (WebSocket server, plugins)
      renderer/     ← React UI (editor, pack browser, settings)
      preload/      ← Electron preload (IPC bridge)
    packs/          ← Zabudované button packs
  android-app/      ← React Native app (Expo) — grid renderer
  .github/
    workflows/
      release.yml   ← Automatický build .exe + .apk na každý release tag
```

---

## Vývoj

### Desktop app

```bash
cd desktop
npm install
npm run electron:dev
```

### Android app

```bash
cd android-app
npm install
npx expo start --android
```

---

## Build a Release

Vytvoř git tag — GitHub Actions automaticky buildí vše:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Za ~10 minut jsou na GitHub Releases dostupné:
- `OpenDeck-Setup-0.1.0.exe` (Windows NSIS installer)
- `OpenDeck-0.1.0.dmg` (macOS)
- `OpenDeck-0.1.0.AppImage` (Linux)
- `OpenDeck.apk` (Android)

**Potřebné GitHub Secrets:**
- `EXPO_TOKEN` — z [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)

---

## Psaní vlastního Button Packu

Každý pack je složka `~/.opendeck/packs/muj-pack/` s:

### `pack.json`
```json
{
  "id": "muj-pack",
  "name": "Můj Pack",
  "version": "1.0.0",
  "description": "Popis",
  "author": "Tvoje jméno",
  "buttons": [
    { "id": "hello", "label": "Hello", "icon": "zap", "defaultSize": "2x1" }
  ]
}
```

### `index.js`
```javascript
export default {
  async setup(ctx) {
    ctx.setState('hello', { label: 'Hello!' });
  },
  handlers: {
    hello: {
      async onPress(payload, ctx) {
        ctx.setState('hello', { active: true, color: '#27ae60' });
        setTimeout(() => ctx.setState('hello', { active: false, color: undefined }), 500);
      }
    }
  }
};
```

Viz `desktop/src/main/plugins/PACK_API.md` pro kompletní API reference.

---

## Licence

GPL-3.0 — svobodný software, navždy.
