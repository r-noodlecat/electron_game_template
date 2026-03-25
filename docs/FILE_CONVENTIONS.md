# File & Data Conventions

This document defines how files, folders, and game data are organized in the project. It is part of the project's convention documentation — read all documents in `docs/` before adding new features.

---

## Folder Structure

The `src/game/` directory is where all renderer-side code lives. Organize it by responsibility, not by file type.

```text
src/
├── main.ts                       ← Electron main process
├── preload.ts                    ← contextBridge API surface
└── game/
    ├── index.html                ← HTML shell + CSP
    ├── main.tsx                  ← React entry point
    ├── App.tsx                   ← Root component (canvas + game loop)
    ├── global.d.ts               ← window.gameAPI type declarations
    │
    ├── engine/                   ← Game logic (no React, no DOM)
    │   ├── GameLoop.ts
    │   ├── Input.ts
    │   ├── SceneManager.ts
    │   ├── Scene.ts
    │   └── entities/
    │       ├── Entity.ts
    │       └── Player.ts
    │
    ├── data/                     ← Static game data (typed .ts files)
    │   ├── types.ts              ← Shared interfaces for all data
    │   ├── enemies.ts
    │   ├── skills.ts
    │   ├── items.ts
    │   └── constants.ts          ← Tuning values, balance numbers
    │
    ├── ui/                       ← React components (UI only)
    │   ├── components/           ← Shared/reusable (GameButton, Modal, Tooltip…)
    │   ├── screens/              ← Full screens (MainMenu, Settings, GameOver…)
    │   └── overlays/             ← In-game HUD layers (HealthBar, Minimap…)
    │
    ├── styles/                   ← CSS files
    │   ├── variables.css         ← All CSS custom properties (colors, z-index, fonts)
    │   ├── base.css              ← Reset, scrollbar, global defaults
    │   └── components/           ← Per-component CSS (when not using CSS modules)
    │
    ├── assets/                   ← Static assets loaded at runtime
    │   ├── sprites/
    │   ├── audio/
    │   ├── fonts/
    │   └── maps/
    │
    └── utils/                    ← Pure helper functions
        ├── math.ts
        └── assets.ts
```

### Folder Rules

- **One responsibility per folder.** `engine/` is game logic. `ui/` is React. `data/` is definitions. Don't mix.
- **`engine/` never imports from `ui/`.** Game logic must not depend on React components. Data flows one way: engine → UI reads state to render.
- **`ui/` never imports from `engine/entities/` directly.** UI components read from a shared game state object or receive data as props — they don't reach into entity internals.
- **`data/` has no side effects.** Files in `data/` export typed constants and nothing else. No function calls, no class instantiation, no imports from `engine/` or `ui/`.
- **`utils/` is pure.** Utility functions take inputs, return outputs, and touch no global state. No React hooks, no DOM access, no engine references.
- **`assets/` is for runtime-loaded files only.** Images, audio, fonts, and map files that are loaded via the asset pipeline at runtime. Do not put TypeScript source files here.
- **Flat within reason.** Don't create deep nesting for the sake of organization. A folder with 2–8 files is fine. Only add subfolders when a category genuinely has distinct subcategories (e.g., `entities/` under `engine/`).

### Naming

- **Folders:** `camelCase` — `engine`, `entities`, `ui`, `components`.
- **TypeScript files:** `PascalCase` for files that export a class or component (`Player.ts`, `GameButton.tsx`). `camelCase` for files that export functions, constants, or data (`math.ts`, `enemies.ts`, `constants.ts`).
- **Asset files:** `kebab-case` with descriptive names — `goblin-idle.png`, `sword-swing.ogg`, `level-01.json`. Include the variant or state in the name, not in a parent folder (prefer `goblin-idle.png` and `goblin-attack.png` in the same folder over `goblin/idle.png` and `goblin/attack.png` — unless there are many variants per entity).
- **CSS files:** `camelCase` to match their corresponding component or purpose — `variables.css`, `base.css`, `gameButton.css`.
- **Test files:** `*.test.ts` or `*.test.tsx`, co-located next to the file they test, or in a mirrored `tests/` tree. Follow whatever pattern is already established in the project.

---

## Game Data Format

### Default: TypeScript Files (`.ts`)

Static game data — definitions of enemies, skills, items, levels, recipes, loot tables, and anything else that forms the game's content catalog — lives in **typed TypeScript files** inside `src/game/data/`.

This is the default and preferred format because:

- The compiler catches missing fields, wrong types, and typos at build time.
- You get autocomplete and inline documentation for every attribute.
- Enums and union types enforce valid categories (damage types, rarity tiers, etc.) without runtime validation.
- Data and types live in the same language, so there's no schema drift.

### When to Use JSON Instead

Use `.json` files (in `src/game/assets/` or `src/game/data/`) only when:

- Data is **generated by an external tool** (level editor, spreadsheet export, procedural generator).
- Data must be **loaded dynamically at runtime** (e.g., downloadable content, user-created mods, server-fetched configs).
- Data needs to be **edited by non-programmers** who shouldn't need to touch TypeScript.

When using JSON, always validate it at load time against the corresponding TypeScript interface. Use a validation library like Zod or a manual type guard — never trust raw JSON with `as SomeType`.

### Never Use These for Game Data

- **YAML / TOML** — adds a parser dependency for no benefit over JSON or TS. Violates the zero-dependency philosophy.
- **XML** — verbose, hard to diff, no advantage in this context.
- **Plain text or CSV** — no structure enforcement, fragile to parse, untyped.
- **JavaScript files** — use TypeScript. `.js` data files bypass the type system.

---

## Structuring a Data File

Every data file follows the same pattern: define a type, export a typed constant.

### Step 1: Define the Interface in `types.ts`

All data interfaces live in `src/game/data/types.ts`. This is the single source of truth for the shape of game data.

```typescript
// src/game/data/types.ts

export type DamageType = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface Enemy {
  id: string
  name: string
  health: number
  damage: number
  damageType: DamageType
  speed: number
  xpReward: number
  description: string
}

export interface Skill {
  id: string
  name: string
  description: string
  manaCost: number
  cooldown: number
  damageType: DamageType
  baseDamage: number
  unlockLevel: number
}
```

### Step 2: Define the Data in a Dedicated File

One file per data category. Export a `readonly` array typed against the interface.

```typescript
// src/game/data/enemies.ts

import { Enemy } from './types';

export const enemies: readonly Enemy[] = [
  {
    id: 'goblin',
    name: 'Goblin',
    health: 30,
    damage: 5,
    damageType: 'physical',
    speed: 1.2,
    xpReward: 10,
    description: 'A small, green menace.',
  },
  {
    id: 'fire-elemental',
    name: 'Fire Elemental',
    health: 80,
    damage: 15,
    damageType: 'fire',
    speed: 0.8,
    xpReward: 50,
    description: 'A roiling mass of living flame.',
  },
] as const;
```

### Step 3: Build Lookup Maps if Needed

If game logic frequently looks up entries by `id`, create a derived map in the same file or in a utility:

```typescript
export const enemyById = new Map(enemies.map(e => [e.id, e]));
```

Do not duplicate the data — derive the map from the source array.

### Rules for Data Files

- **Every entry in the array must satisfy the full interface.** No optional fields unless the interface explicitly marks them optional with `?`. If most entries share a default value, the interface should still require the field — set it explicitly on each entry so the data is self-documenting.
- **Use `readonly` arrays and `as const`** where possible. This prevents accidental mutation at runtime and enables narrower type inference.
- **IDs are `string`, unique, and kebab-case** — `'fire-elemental'`, not `'FireElemental'` or `3`. String IDs are easier to debug, search for in code, and reference in other data files.
- **No logic in data files.** Data files export plain objects and arrays. No functions, no computed values, no conditionals. If a derived value is needed (e.g., "effective DPS"), compute it in `engine/` or `utils/`, not in the data definition.
- **One category per file.** Don't combine enemies and items in the same file. Each file should export one primary array (and optionally a derived lookup map).
- **Keep entries ordered.** Alphabetical by `id` is the default. If a different ordering makes more sense for the data (e.g., enemies sorted by difficulty tier), document the ordering convention in a comment at the top of the file.

---

## Constants & Tuning Values

Numeric values that control game balance and behavior live in `src/game/data/constants.ts`. This is the single file to adjust when tuning the game.

```typescript
// src/game/data/constants.ts

/** Physics and movement */
export const GRAVITY = 980;              // pixels/sec²
export const PLAYER_SPEED = 200;         // pixels/sec
export const PLAYER_JUMP_FORCE = 400;    // pixels/sec

/** Combat */
export const BASE_CRIT_CHANCE = 0.05;    // 5%
export const CRIT_MULTIPLIER = 1.5;

/** Progression */
export const XP_PER_LEVEL_BASE = 100;
export const XP_PER_LEVEL_SCALE = 1.15;  // each level needs 15% more XP

/** Timing */
export const INVINCIBILITY_FRAMES = 60;  // frames of i-frames after being hit
export const RESPAWN_DELAY = 2000;       // ms
```

### Rules for Constants

- **`UPPER_SNAKE_CASE`** for all exported constants. This visually distinguishes tuning values from data arrays and functions.
- **Always include a JSDoc comment or inline comment** with the unit (pixels, seconds, milliseconds, percent, frames, etc.). A bare `400` is meaningless without context.
- **Group related constants** under section comments. Don't scatter physics values across the file.
- **No magic numbers in game logic.** Every literal number used in `engine/` code should trace back to a named constant from this file. If you find yourself writing `if (health < 20)` in game logic, extract `20` into a constant like `LOW_HEALTH_THRESHOLD`.

---

## Asset Files

Assets are runtime-loaded resources stored in `src/game/assets/`. Vite handles these as static assets — they are copied to the build output and referenced by URL.

### Supported Formats

| Category | Preferred Formats | Notes |
| --- | --- | --- |
| **Sprites / images** | `.png` | Transparency support, lossless. Use `.webp` if file size is critical. Avoid `.jpg` for sprites (lossy artifacts). |
| **Audio — SFX** | `.ogg`, `.wav` | `.ogg` for compressed, `.wav` for short uncompressed clips. Avoid `.mp3` (licensing baggage, worse quality-per-byte than `.ogg`). |
| **Audio — Music** | `.ogg` | Good compression, no licensing issues, wide Chromium support. |
| **Fonts** | `.woff2` | Best compression for web fonts. Fall back to `.woff` if needed. |
| **Level / map data** | `.json` | Structured data exported from a level editor. Validate against a TypeScript interface at load time. |
| **Spritesheets** | `.png` + `.json` | Image file paired with a JSON atlas describing frame positions. |

### Rules for Assets

- **No spaces in filenames.** Use `kebab-case`: `skeleton-walk-01.png`, not `Skeleton Walk 01.png`.
- **Include dimensions or variant in the name** when multiple sizes exist: `logo-64.png`, `logo-128.png`.
- **Keep asset folders flat** unless a category has enough files to warrant subfolders. A `sprites/` folder with 15 files is fine. A `sprites/` folder with 80 files should be split (e.g., `sprites/enemies/`, `sprites/ui/`).
- **Always handle load failure.** See the Error Handling section in the copilot instructions — never assume an asset exists at runtime.

---

## File Locations Summary

| What | Where | Format |
| --- | --- | --- |
| Type interfaces for data | `src/game/data/types.ts` | TypeScript |
| Static game definitions (enemies, skills, items) | `src/game/data/*.ts` | TypeScript |
| Tuning values and balance constants | `src/game/data/constants.ts` | TypeScript |
| Level/map data from external tools | `src/game/assets/maps/*.json` | JSON (validated at load) |
| Sprites, audio, fonts | `src/game/assets/` | See asset format table |
| React UI components | `src/game/ui/` | TypeScript + TSX |
| Game engine logic | `src/game/engine/` | TypeScript |
| Pure utility functions | `src/game/utils/` | TypeScript |
| CSS variables, base styles | `src/game/styles/` | CSS |
| Electron main process | `src/main.ts` | TypeScript |
| Preload / IPC bridge | `src/preload.ts` | TypeScript |
| `window.gameAPI` types | `src/game/global.d.ts` | TypeScript |

---

## Related Documents

All convention documents live in `docs/`. When adding a new convention document, add it to each existing Related Documents table.

| Document | Covers |
| --- | --- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Process model, security design, build pipeline, IPC patterns |
| [`CODE_ORGANIZATION.md`](./CODE_ORGANIZATION.md) | File decomposition, screen structure, data extraction, engine modularity |
| [`COPILOT_TIPS.md`](./COPILOT_TIPS.md) | Quick-reference Copilot Chat prompts for common template tasks |
| [`INPUT_CONVENTIONS.md`](./INPUT_CONVENTIONS.md) | Keyboard behavior, Escape key priority, movement key rules |
| [`UI_CONVENTIONS.md`](./UI_CONVENTIONS.md) | Visual patterns: tooltips, modals, buttons, animations, z-index, colors |
