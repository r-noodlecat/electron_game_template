---
description: "Code structure, file decomposition, screen extraction, data separation, and engine modularity rules for the renderer"
applyTo: "src/game/**/*.{ts,tsx}"
---

# Code Organization Conventions

When adding new files, components, or game content to the renderer, follow the standards in [docs/CODE_ORGANIZATION.md](../../docs/CODE_ORGANIZATION.md). That file is the authoritative source — this summary provides quick-reference rules for the most common decisions. When in doubt, consult the full doc. For the complete set of project conventions, see all documents in the `docs/` folder.

---

## Keep Main Files Clean

- `App.tsx` is a thin orchestrator — it composes screens, providers, and the game loop. It does not contain menu UI, game data, HUD elements, or complex logic.
- If a block of code can be described as "the _____ part" (the inventory panel, the pause menu, the health bar), extract it into its own component or module immediately.
- Complex state logic → custom hook or state module. Utility functions → `utils/`. Inline styles → CSS file.

## Screen & Menu Decomposition

- Every distinct screen or menu is its own file in `ui/screens/`.
- Break screens into sub-components when a section is reusable or the file exceeds ~200 lines of JSX.
- Shared UI primitives (`GameButton`, `Modal`, `Tooltip`) live in `ui/components/` — never duplicate them.

```text
ui/screens/Inventory.tsx          ← layout + composition only
ui/components/InventoryGrid.tsx   ← the item grid
ui/components/ItemDetail.tsx      ← selected item info panel
```

## No Hardcoded Game Data

- **All game content** (items, enemies, resources, locations, skills, recipes, loot tables, quests, progression tables) lives in `src/game/data/` as typed TypeScript files.
- Never define game content inline in a component, engine file, or App.tsx — even for a single item or "just for testing."
- All data interfaces go in `data/types.ts`. One file per category (`items.ts`, `enemies.ts`, `locations.ts`). `readonly` arrays, string IDs, kebab-case.
- All balance/tuning numbers go in `data/constants.ts` with `UPPER_SNAKE_CASE` and unit comments. No magic numbers in engine or UI code.

```typescript
// WRONG — inline data in a component
const sword = { id: 'iron-sword', name: 'Iron Sword', damage: 10 };

// RIGHT — import from data layer
import { items } from '../data/items';
const sword = items.find(i => i.id === 'iron-sword');
```

## Asset Organization

- All art, audio, and font assets go in `assets/` with subfolder separation by type.
- Create subfolders (`sprites/enemies/`, `sprites/items/`, `audio/sfx/`) when a folder exceeds ~15 files or has clear groupings.
- Never place art files alongside TypeScript source. Never reference assets by hardcoded absolute paths.

```text
assets/
├── sprites/          ← characters, tilesets, icons, VFX
│   ├── enemies/
│   ├── items/
│   └── ui/
├── audio/
│   ├── sfx/
│   └── music/
├── fonts/
└── maps/
```

## Engine Modularity

- One game system per file in `engine/` — don't create monolithic managers.
- Engine files import from `data/` to read definitions. Engine files never define game content.
- Split an engine file when it handles multiple unrelated systems or exceeds comfortable navigation.

## Anti-Patterns to Avoid

- **Monolithic App.tsx** — menus, game logic, and data all in one file.
- **Inline game data** — item/enemy arrays defined inside components or engine code.
- **God manager** — one engine file handling input, physics, combat, and inventory.
- **Duplicated UI** — same button/modal pattern reimplemented across screens.
- **Scattered assets** — art files mixed with source code outside `assets/`.
- **Magic numbers** — bare literals (`health < 20`, `damage * 1.5`) instead of named constants.
