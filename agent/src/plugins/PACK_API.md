# OpenDeck Pack API Reference

## Context object (`ctx`)

Každý handler a `setup()` funkce dostane `ctx` objekt:

```typescript
interface PackContext {
  /** Aktualizuj stav tlačítka (mergeuje s existujícím stavem) */
  setState(buttonId: string, state: Partial<ButtonState>): void;

  /** Přečti aktuální stav tlačítka */
  getState(buttonId: string): ButtonState | null;

  /** Logger (prefix s názvem packu) */
  log(msg: string): void;
}
```

## ButtonState

```typescript
interface ButtonState {
  label?: string;       // Hlavní text
  sublabel?: string;    // Menší text pod labelem
  icon?: string;        // Lucide icon name (např. "mic-off")
  color?: string;       // Hex background (např. "#e74c3c")
  textColor?: string;   // Hex barva textu
  progress?: number;    // 0-100 — progress bar na spodku
  badge?: string|number; // Malý odznak (např. počet zpráv)
  active?: boolean;     // Zvýrazněný stav (border + tint)
  disabled?: boolean;   // Zašedlé, neklikatelné
}
```

## Struktura handleru

```javascript
handlers: {
  moje_tlacitko: {
    // Krátký stisk (povinné)
    async onPress(payload, ctx) { ... },

    // Dlouhý stisk (volitelné)
    async onHold(payload, ctx) { ... },

    // Uvolnění po hold (volitelné — pro push-to-talk)
    async onRelease(payload, ctx) { ... },
  }
}
```

## Payload

`payload` obsahuje konfiguraci konkrétního tlačítka nastavenou uživatelem v appce.
Například pro `run_command` pack:
```json
{ "command": "notify-send 'Hello'", "label": "Notifikace" }
```

## Velikosti tlačítek

| Velikost | Sloupce × Řádky | Použití |
|----------|-----------------|---------|
| `1x1` | 1×1 | Základní tlačítko |
| `2x1` | 2×1 | Tlačítko s labelem |
| `1x2` | 1×2 | Vertikální widget |
| `2x2` | 2×2 | Velký widget |
| `3x1` | 3×1 | Media controls row |
| `4x1` | 4×1 | Široký progress bar |
| `5x1` | 5×1 | Full-width banner |

## Ikony

Používáme Lucide ikony. Kompletní seznam: https://lucide.dev/icons/

Klíčové pro packs:
- `mic`, `mic-off` — mikrofon
- `headphones` — sluchátka
- `radio` — streaming
- `circle` — nahrávání
- `terminal` — příkazy
- `keyboard` — klávesová zkratka
- `volume-2`, `volume-x` — hlasitost
- `play`, `skip-forward`, `skip-back` — media
- `zap` — obecná akce
