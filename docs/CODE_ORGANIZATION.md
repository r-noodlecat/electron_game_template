# Code Organization Conventions

This document defines how code should be structured as the project grows. It is part of the project's convention documentation — read all documents in `docs/` before adding new features.

The core principle: **main files stay clean, game content lives in data, and every distinct concern gets its own file.**

---

## Keep Main Files Clean

`App.tsx`, `main.tsx`, and any root-level component should be thin orchestrators — they compose pieces, they don't contain them.

### What Belongs in App.tsx

- Scene/screen switching logic (rendering the current screen component).
- Global providers or context wrappers.
- The game loop hook (if canvas-based).
- Top-level layout structure (a few lines of JSX that arrange major regions).

### What Does NOT Belong in App.tsx

- Menu UI, settings panels, HUD elements, or any screen-specific markup.
- Game data definitions, constants, or configuration objects.
- Complex state logic — extract into a custom hook or state module.
- Utility functions — move to `utils/`.
- Inline styles longer than 2–3 properties — extract to a CSS file.

### The Rule of Extraction

If a block of code in a main file could be described as "the _____ part" (the inventory panel, the pause menu, the health bar, the enemy list), it is a candidate for extraction into its own component or module. Don't wait until the file is unmanageable — extract early and often.

---

## Screen & Menu Decomposition

Every distinct screen, menu, or dialog is its own component file. Screens are further broken into focused sub-components.

### One Screen, One File

Each full-screen view lives in `ui/screens/` as a standalone component:

```text
ui/screens/
├── MainMenu.tsx
├── Settings.tsx
├── GameOver.tsx
├── CharacterSelect.tsx
├── PauseMenu.tsx
└── Inventory.tsx
```

A screen component owns its layout and composes its children — it does not contain the implementation of every panel, list, and button group within it.

### Break Screens into Sub-Components

If a screen has identifiable sections (a sidebar, a detail panel, a toolbar, a list), each section should be its own component in `ui/components/` or co-located alongside the screen.

```text
ui/screens/Inventory.tsx          ← layout + composition
ui/components/InventoryGrid.tsx   ← the item grid
ui/components/ItemDetail.tsx      ← selected item info
ui/components/EquipmentSlots.tsx  ← equipped gear display
```

### Signs a Component Needs Splitting

- The file exceeds ~200 lines of JSX.
- You find yourself commenting sections like `{/* Header */}` or `{/* Footer */}` inside one component's return.
- The component manages state for two or more unrelated concerns.
- A piece of the component could be reused elsewhere but can't be because it's tangled into the parent.

### Shared UI Components

Reusable primitives (`GameButton`, `Modal`, `Tooltip`, `ContextMenu`, `Toast`) live in `ui/components/` and are imported by screens — never duplicated.

---

## Game Data Extraction

Game content — anything that defines what exists in the game world — must never be hardcoded in component files, engine logic, or inline arrays. All game data lives in `src/game/data/` as typed TypeScript files.

### What Counts as Game Data

- Item definitions (weapons, armor, consumables, materials).
- Enemy/NPC definitions (stats, loot tables, behavior tags).
- Resource types (ores, herbs, crafting materials).
- Map locations, regions, points of interest.
- Skill/ability definitions.
- Dialogue trees, quest definitions, event triggers.
- Recipe/crafting tables.
- Loot tables and drop rates.
- Progression tables (XP curves, level thresholds, unlock requirements).
- Shop inventories, vendor stock lists.
- Any catalog of "things" the player can encounter, collect, or interact with.

### Where Game Data Lives

All game data goes in `src/game/data/`, one file per category, with shared types in `types.ts`:

```text
data/
├── types.ts          ← all data interfaces (single source of truth)
├── constants.ts      ← tuning values and balance numbers
├── items.ts          ← item definitions
├── enemies.ts        ← enemy definitions
├── resources.ts      ← resource/material definitions
├── locations.ts      ← map locations, regions, POIs
├── skills.ts         ← skill/ability definitions
├── recipes.ts        ← crafting recipes
├── lootTables.ts     ← drop rates and loot pools
└── quests.ts         ← quest/event definitions
```

### The No-Hardcoding Rule

**Never define game content inline.** If you find yourself writing an object literal that describes a game entity inside a component, engine file, or utility — stop and move it to `data/`.

Wrong:

```typescript
// Inside a component or engine file — DON'T DO THIS
const sword = { id: 'iron-sword', name: 'Iron Sword', damage: 10, rarity: 'common' };
```

Right:

```typescript
// data/items.ts
export const items: readonly Item[] = [
  { id: 'iron-sword', name: 'Iron Sword', damage: 10, rarity: 'common' },
  // ...
];

// Component or engine file — reference by import or lookup
import { items } from '../data/items';
const sword = items.find(i => i.id === 'iron-sword');
```

This applies even for single items, test data, or "just one quick entry." If it describes game content, it belongs in `data/`.

### Data File Rules (Summary)

These are defined fully in [FILE_CONVENTIONS.md](./FILE_CONVENTIONS.md) — key points repeated here for emphasis:

- TypeScript files, not JSON (unless loaded dynamically or generated by external tools).
- All interfaces in `data/types.ts`.
- `readonly` arrays, `as const` where possible.
- String IDs, kebab-case, unique per category.
- No logic in data files — no functions, no conditionals, no computed values.
- Alphabetical by `id` unless a different ordering is documented.

---

## Asset Organization

All runtime-loaded assets (images, audio, fonts, map files) live in `src/game/assets/` with clear subfolder separation by type.

### Required Folder Structure

```text
assets/
├── sprites/          ← character art, tilesets, UI icons, VFX frames
│   ├── enemies/      ← enemy sprites (when 10+ files)
│   ├── items/        ← item/equipment icons
│   ├── ui/           ← UI-specific graphics (buttons, frames, backgrounds)
│   └── environment/  ← tiles, terrain, props
├── audio/
│   ├── sfx/          ← sound effects
│   └── music/        ← background music, ambience
├── fonts/            ← .woff2 font files
└── maps/             ← level/map JSON data from editors
```

### When to Create Subfolders

- A category folder has **more than ~15 files** — split into logical subfolders.
- A category has **clear groupings** (enemy sprites vs. item icons vs. UI elements) — split even if file count is low, for discoverability.
- When in doubt, start flat and split later. An `assets/sprites/` folder with 8 files doesn't need subfolders yet.

### Art Asset Rules

- Every art asset used in the game must live in `assets/`, not loose in `src/` or alongside components.
- Never reference art assets by hardcoded absolute path — use the Vite asset import pattern or a centralized asset loader in `utils/assets.ts`.
- Group related assets together. If an entity has multiple states (idle, walk, attack), all variants live in the same folder and follow the naming pattern: `goblin-idle.png`, `goblin-walk.png`, `goblin-attack.png`.
- See [FILE_CONVENTIONS.md](./FILE_CONVENTIONS.md) for format rules (PNG for sprites, OGG for audio, WOFF2 for fonts, kebab-case names, no spaces).

---

## Engine Code Modularity

Engine logic in `src/game/engine/` follows the same decomposition principles as UI code — one responsibility per file, no monolithic managers.

### One System, One File

Each distinct game system gets its own module:

```text
engine/
├── GameLoop.ts           ← requestAnimationFrame loop + delta time
├── Input.ts              ← keyboard/mouse/gamepad state
├── SceneManager.ts       ← screen/scene switching
├── Scene.ts              ← base scene interface
├── Physics.ts            ← collision detection, movement resolution
├── Combat.ts             ← damage calculation, hit detection
├── Inventory.ts          ← inventory management logic
├── Crafting.ts           ← recipe resolution, crafting logic
├── Progression.ts        ← XP, leveling, unlock checks
└── entities/
    ├── Entity.ts         ← base entity (position, update, draw)
    ├── Player.ts         ← player entity
    └── Enemy.ts          ← enemy entity
```

### Signs an Engine File Needs Splitting

- The file has multiple exported classes or large exported functions that serve different purposes.
- You find yourself scrolling past hundreds of lines of one system to find another.
- Two blocks of logic in the same file never reference each other — they're independent systems sharing a file for convenience.

### Engine ↔ Data Boundary

Engine files **import from** `data/` to read definitions and constants. Engine files **never define** game content — if an engine function needs to know what enemies exist or what an item does, it imports from the data layer.

```typescript
// engine/Combat.ts — reads data, doesn't define it
import { enemies } from '../data/enemies';
import { CRIT_MULTIPLIER } from '../data/constants';
```

---

## Where Things Go — Quick Reference

| What | Where | Never Put It In |
| ---- | ----- | --------------- |
| Item/enemy/skill definitions | `data/*.ts` | Components, engine files, App.tsx |
| Balance numbers, tuning values | `data/constants.ts` | Inline literals in engine or UI code |
| Data type interfaces | `data/types.ts` | Scattered across multiple files |
| Full-screen views | `ui/screens/` | App.tsx |
| Reusable UI primitives | `ui/components/` | Duplicated inside each screen |
| In-game HUD elements | `ui/overlays/` | App.tsx or screen files |
| Game systems (combat, physics) | `engine/` (one file per system) | UI components |
| Entity classes | `engine/entities/` | `data/` or `ui/` |
| Sprites, icons, tilesets | `assets/sprites/` | `src/` root or alongside components |
| Sound effects, music | `assets/audio/` | Anywhere outside `assets/` |
| Fonts | `assets/fonts/` | Anywhere outside `assets/` |
| Pure helper functions | `utils/` | Engine or UI files |
| CSS custom properties | `styles/variables.css` | Inline in components |

---

## Anti-Patterns

These are the specific mistakes this document exists to prevent. If a code review or generation step produces any of these, refactor immediately.

### Monolithic App.tsx

App.tsx contains menu markup, game logic, inline data, and HUD elements all in one file. **Fix:** Extract each concern into its own component/module.

### Inline Game Data

An array of items, enemies, or locations is defined inside a component or engine file rather than in `data/`. **Fix:** Move to the appropriate `data/*.ts` file and import it.

### God Manager

A single engine file (`GameManager.ts`) handles input, physics, combat, inventory, and rendering. **Fix:** Split into focused single-responsibility modules.

### Duplicated UI

The same button style, modal layout, or tooltip pattern is reimplemented in multiple screens instead of using a shared component. **Fix:** Extract to `ui/components/` and reuse.

### Scattered Assets

Art files mixed into `src/game/` alongside TypeScript files, or dumped in the project root. **Fix:** Move all assets into the appropriate `assets/` subfolder.

### Magic Numbers in Logic

Hardcoded numeric values (`if (health < 20)`, `damage * 1.5`, `speed = 200`) appear directly in engine or component code. **Fix:** Extract to named constants in `data/constants.ts`.

---

## Related Documents

All convention documents live in `docs/`. When adding a new convention document, add it to each existing Related Documents table.

| Document                                         | Covers                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)           | Process model, security design, build pipeline, IPC patterns            |
| [`COPILOT_TIPS.md`](./COPILOT_TIPS.md)           | Quick-reference Copilot Chat prompts for common template tasks          |
| [`FILE_CONVENTIONS.md`](./FILE_CONVENTIONS.md)   | File naming, data formats, asset format rules, folder responsibilities  |
| [`INPUT_CONVENTIONS.md`](./INPUT_CONVENTIONS.md) | Keyboard behavior, Escape key priority, movement key rules              |
| [`UI_CONVENTIONS.md`](./UI_CONVENTIONS.md)       | Visual patterns: tooltips, modals, buttons, animations, z-index, colors |
