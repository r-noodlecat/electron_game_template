---
description: Workspace instructions for the Electron game template, including code, UI, and documentation authoring rules
applyTo: "**"
---

# GitHub Copilot Instructions

This is an **Electron + React + TypeScript + Vite desktop game template**. Use these instructions to guide all code generation, suggestions, and architectural decisions.

## Project Overview

- **Runtime**: Electron (Node.js main process + Chromium renderer process)
- **UI**: React (component-based renderer UI)
- **Language**: TypeScript (strict mode, ESNext target, JSX via react-jsx)
- **Bundler**: Vite + @vitejs/plugin-react (renderer bundling, HMR, CSS)
- **Build**: Main process via `tsc -p tsconfig.main.json`; renderer via `vite build`

See `docs/ARCHITECTURE.md` for the full process model, file tree, security design, and build pipeline. All project conventions (UI, input, file organization, code structure) are documented in the `docs/` folder — each section below summarizes one of those documents and points to the authoritative source. For a quick-reference prompt cheat sheet for common tasks, see `docs/COPILOT_TIPS.md`.

---

## Active Instructions Files

These files live in `.github/instructions/` and activate automatically in VS Code based on their `applyTo` glob. When working in matching source files, Copilot applies the conventions from each:

- `architecture.instructions.md` — Process boundaries, IPC patterns, security, and build pipeline
- `code-organization.instructions.md` — Code structure, decomposition, screen extraction, and data separation
- `file-conventions.instructions.md` — File naming, folder responsibilities, game data formats, and asset rules
- `input-conventions.instructions.md` — Keyboard handling, Escape chain, WASD/arrow equivalence, and movement input
- `ui-conventions.instructions.md` — Component patterns, color system, typography, tooltips, modals, and toasts

---

## Architecture Rules

The three-process boundary is the most important constraint in this project. Never blur it.

- **`main.ts`** — Node.js/Electron APIs only. Never touches the DOM.
- **`preload.ts`** — The sole `contextBridge.exposeInMainWorld()` call site. Keep the exposed surface minimal and typed.
- **`src/game/**`** — Browser APIs + React only. No Node.js imports. Access main-process features through `window.gameAPI`.

### Security — Never Violate These

- `nodeIntegration: false` and `contextIsolation: true` — always.
- Never disable or loosen the Content Security Policy set in `main.ts`.
- Never use `eval()`, `new Function()`, or dynamic `require()` in the renderer.
- Validate and sanitize all data received via IPC in `ipcMain` handlers.
- Never expose the raw `ipcRenderer` object — wrap each channel in a typed function.

---

## Code Style

- **TypeScript strict mode is ON** — all variables must have types; avoid `any`.
- **2-space indentation**, single quotes for strings.
- **No semicolons on type/interface declarations** but do use them on statements.
- PascalCase for classes and components: `Player`, `GameLoop`, `HUD`.
- camelCase for functions and variables: `updatePhysics`, `renderFrame`.
- Prefer `const` over `let`; never use `var`.
- Explicit return types on all functions.
- Group imports: Node built-ins → Electron → third-party → local modules.

## Markdown Files

When creating or editing Markdown in this workspace, follow the Markdown instructions and writing-style instructions as mandatory requirements, not suggestions.

- Do not introduce markdownlint warnings in new or modified `.md` files.
- Start every new Markdown file with valid YAML frontmatter.
- Preserve valid heading order, required blank lines, and a single trailing newline at EOF.
- Use fenced code blocks with language identifiers and avoid trailing spaces.
- Fix Markdown rule violations as part of the same change rather than leaving yellow warnings behind.

---

## Patterns

These are the canonical patterns for this template. When generating new code, follow these — do not invent alternatives.

### Game Loop

Use `useRef` + `useEffect` + `useCallback` in a React component. Track `lastTime` in a ref, compute delta time in seconds, and call `requestAnimationFrame` recursively. Clean up with `cancelAnimationFrame` in the effect's return. See `src/game/App.tsx` for the reference implementation.

### Canvas Setup

Get the 2D context in a `useEffect`. Handle DPR scaling: multiply `clientWidth`/`clientHeight` by `devicePixelRatio`, set those as the canvas `width`/`height`, then call `ctx.scale(dpr, dpr)`. Listen for `resize` events and clean up the listener on unmount.

### IPC Communication

Three patterns, all wired through `preload.ts`:

```typescript
// One-way (renderer → main):
saveGame: (data: string) => ipcRenderer.send('save-game', data)

// Two-way (renderer → main → renderer):
loadGame: () => ipcRenderer.invoke('load-game')

// Push events (main → renderer) — return an unsubscribe function:
onPause: (cb: () => void): (() => void) => {
  const handler = () => cb();
  ipcRenderer.on('pause-game', handler);
  return () => ipcRenderer.removeListener('pause-game', handler);
}
```

Declare the `window.gameAPI` type in `src/game/global.d.ts`.

### Input Handling

Track input in a plain object with a `keys: Set<string>` and `mouse: { x, y, buttons }`. Bind `keydown`/`keyup`/`mousemove` listeners. Read state each frame in the game loop — never handle game logic inside event callbacks. Use `event.code` (physical key position) rather than `event.key` for movement bindings. See **Input Conventions** below for Escape key behavior and WASD/arrow key rules.

---

## State Management

Game state should live **outside React** in plain TypeScript classes or objects (e.g., an `engine/GameState.ts`). React components read from this state to render UI overlays (HUD, menus) but do not own it.

- Use React state (`useState`, `useReducer`) only for UI-specific concerns: menu visibility, dialog content, settings panels.
- Use refs (`useRef`) to hold mutable values the game loop needs without triggering re-renders: canvas context, input state, timing.
- Never store per-frame game data (entity positions, velocities, cooldowns) in React state — updates at 60fps will cause performance problems.

---

## Error Handling

### IPC Failures

Wrap all `window.gameAPI` calls that return promises in try/catch. Display a user-facing error (toast, overlay) rather than silently swallowing failures. Log the error with enough context to debug:

```typescript
try {
  const data = await window.gameAPI.loadGame();
} catch (err) {
  console.error('[IPC] loadGame failed:', err);
  // Show error to user via UI overlay
}
```

In `main.ts`, catch errors inside `ipcMain.handle` handlers and return structured error responses rather than letting exceptions propagate raw.

### Asset Loading

Always handle the failure case when loading images, audio, or JSON. Use a loading state in the UI so the game doesn't start rendering before assets are ready. If a critical asset fails, show an error screen — do not render a broken frame.

### Game Loop

Never let an unhandled exception kill the game loop. Wrap the update/render cycle in try/catch and log errors, but keep the loop alive.

---

## What to Avoid

- Do **not** add `jquery`, `lodash`, or heavy utility libraries — use native APIs.
- Do **not** create inline `<script>` tags in HTML (violates CSP).
- Do **not** store secrets or API keys in renderer code.
- Do **not** use the `remote` module (deprecated in modern Electron).
- Do **not** generate CommonJS `require()` calls in renderer files — use ES module imports.
- Do **not** use class components in React — functional components with hooks only.
- Do **not** hardcode game data (items, enemies, locations) inside components or engine files — all game content belongs in `src/game/data/`.
- Do **not** put screen-specific UI (menus, HUD panels, dialogs) directly in `App.tsx` — extract each into its own component.
- Do **not** use magic numbers in game logic — extract every literal into a named constant in `data/constants.ts`.
- Do **not** place art or audio assets alongside TypeScript source files — all assets go in `assets/` with proper subfolders.

---

## Dependencies

When adding libraries:

1. Prefer packages with built-in TypeScript types or `@types/...` available.
2. Prefer packages that work in a browser/Chromium context — no Node.js-only libraries in renderer code.
3. Install as `devDependencies` unless needed at runtime.
4. Update `tsconfig.json` if the library needs special module resolution.

---

## UI Conventions

All user-facing UI must follow the standards in `docs/UI_CONVENTIONS.md`. That file is the source of truth for all visual and interaction patterns. What follows is a high-level summary — always defer to the full doc for implementation details.

### Foundational Rules

- **Minimum window size:** `1024×768`. Do not design for smaller.
- **Readability over scalability.** Use `rem` units with `max()` clamps. Hard font floors: body `14px`, labels `12px`, headings `18px`.
- **Artistic fonts** are for titles/headings only. Body text, labels, and tooltips use a clean, legible font.
- **All colors** come from semantic CSS variables (`--bg-primary`, `--accent`, `--danger`, etc.). Never hard-code hex values.
- **Fonts are consistent by element type.** All buttons share one font/weight/size. All headings share another. Defined in one place.
- **Default gap** between elements in any grid or stack: `5px` via the `gap` property.

### Component Patterns

- **Buttons:** Rounded corners, subtle drop shadow, flex-centered text, mandatory hover color shift (`120ms ease-out`), `scale(0.97)` on `:active`.
- **Tooltips:** Per-instance React components. Parent tracks cursor and passes `{ x, y }` props. Position at `left: x`, `top: y + 20`. Show delay `400ms`, hide `0ms`, no fade. Viewport clamp. `role="tooltip"`.
- **Modals:** Semi-transparent backdrop, centered, scale+fade animation (`150ms`). Close via Escape, backdrop click (non-destructive only), or close button. Render via portal. Avoid stacking.
- **Context Menus:** Custom-rendered React components (never native OS menus). Spawn at cursor, viewport clamp, dismiss on click-outside/Escape/scroll/blur. Flat structure (no nested submenus). Render via portal.
- **Toasts:** Bottom-right, stack upward, max 3 visible. Auto-dismiss at `4s` (errors persist). Four types: info, success, warning, error with colored left border. Hover pauses dismiss timer. Global toast manager pattern.
- **Drag & Drop:** `3–5px` movement threshold before committing. Draggable elements receive the same hover color/tint shift as buttons (`120ms ease-out`). Semi-transparent ghost preview at `0.6–0.7` opacity. Valid drop targets highlight with `--accent`. Escape cancels. `pointer-events: none` on the ghost element.

### System-Level Rules

- **Z-index tiers:** Base `0` → Raised `10` → Dropdowns `20` → Overlays `30` → Modals `40` → Tooltips `50` → Critical `100+`. Never use arbitrary values.
- **Animations:** `ease-out` for entrances, `ease-in` for exits. `120–150ms` for micro-interactions, `200–250ms` for panel transitions. Only animate `transform` and `opacity`.
- **Scrollbars:** Custom-styled (thin, rounded, themed). `overflow: auto` only. Overlay mode, fade when idle.
- **Disabled states:** Opacity `0.45–0.5`, desaturated, `cursor: not-allowed`, no hover effects. Pair with explanatory tooltip if reason isn't obvious.
- **Empty states:** Placeholder label or dashed outline. Preserve grid shape. Use `--text-muted`.
- **Loading states:** Shimmer skeleton placeholders for known layouts. Spinners only for indeterminate waits.
- **Pointer events:** Apply `pointer-events: none` to drag ghosts, decorative overlays, animation pseudo-elements, and toast containers. Always comment the reason in code.
- **Cursor styles:** `pointer` for clickable, `grab`/`grabbing` for draggable, `not-allowed` for disabled. Never leave interactive elements with the default arrow.

---

## File & Data Conventions

All file organization, naming, data formats, and asset rules must follow the standards in `docs/FILE_CONVENTIONS.md`. That file is the source of truth — what follows is a high-level summary.

### Folder Responsibilities

- `engine/` — Game logic. No React, no DOM. Never imports from `ui/`.
- `data/` — Static game data. Typed `.ts` exports only. No side effects, no imports from `engine/` or `ui/`.
- `ui/components/` — Shared React components (`GameButton`, `Modal`, `Tooltip`…).
- `ui/screens/` — Full screens (`MainMenu`, `Settings`, `GameOver`…).
- `ui/overlays/` — In-game HUD layers (`HealthBar`, `Minimap`…).
- `styles/` — CSS files. All custom properties in `variables.css`.
- `assets/` — Runtime-loaded files only (sprites, audio, fonts, maps).
- `utils/` — Pure helper functions. No React hooks, no DOM, no engine refs.

### Naming

- **Folders:** `camelCase` — `engine`, `entities`, `components`.
- **Class/component files:** `PascalCase` — `Player.ts`, `GameButton.tsx`.
- **Function/data/constant files:** `camelCase` — `math.ts`, `enemies.ts`, `constants.ts`.
- **Asset files:** `kebab-case` — `goblin-idle.png`, `sword-swing.ogg`. No spaces.
- **CSS files:** `camelCase` — `variables.css`, `gameButton.css`.

### Game Data

- **Default format: TypeScript.** Static definitions (enemies, skills, items, loot tables) are typed `.ts` files in `src/game/data/`.
- Define all interfaces in `data/types.ts` — single source of truth for data shapes.
- One file per category: `enemies.ts`, `skills.ts`, `items.ts`.
- Export `readonly` arrays typed against the interface. Use `as const` where possible.
- IDs are `string`, unique, `kebab-case`: `'fire-elemental'`, not `'FireElemental'` or `3`.
- No logic in data files — no functions, no computed values, no conditionals.
- **Use JSON only** when data is generated by external tools, loaded dynamically at runtime, or edited by non-programmers. Always validate against the TypeScript interface at load time.
- **Never use** YAML, TOML, XML, CSV, plain text, or `.js` files for game data.

### Constants & Tuning

- All balance and behavior numbers live in `src/game/data/constants.ts`.
- `UPPER_SNAKE_CASE` for all exported constants.
- Always comment the unit: pixels, seconds, ms, percent, frames.
- No magic numbers in `engine/` code — extract every literal into a named constant.

### Asset Formats

- **Sprites/images:** `.png` (avoid `.jpg` for sprites).
- **Audio — SFX:** `.ogg`, `.wav` (avoid `.mp3`).
- **Audio — Music:** `.ogg`.
- **Fonts:** `.woff2`.
- **Level/map data:** `.json` (validated against TypeScript interface at load time).
- No spaces in asset filenames. `kebab-case` only.
- Always handle asset load failure at runtime.

---

## Code Organization

All code structure and decomposition must follow the standards in `docs/CODE_ORGANIZATION.md`. That file is the source of truth — what follows is a high-level summary.

### Main Files Stay Clean

- `App.tsx` is a thin orchestrator — it composes screens, providers, and the game loop. It does not contain menu markup, game data, HUD elements, or complex logic.
- If a block of code can be described as "the _____ part" (the inventory panel, the pause menu), it belongs in its own component or module — extract immediately, don't wait.

### Screen & Menu Decomposition

- Every distinct screen or menu is its own file in `ui/screens/`.
- Break screens into sub-components when sections are reusable or the file exceeds ~200 lines of JSX.
- Shared UI primitives (`GameButton`, `Modal`, `Tooltip`) live in `ui/components/` — never duplicate them across screens.

### No Hardcoded Game Data

- **All game content** (items, enemies, resources, locations, skills, recipes, loot tables, quests, progression tables) lives in `src/game/data/` as typed TypeScript files. No exceptions.
- Never define game content inline in a component, engine file, or App.tsx — not even for a single item, not even "just for testing."
- All balance and tuning numbers live in `data/constants.ts` as named constants. No magic numbers in engine or UI code.

### Asset Organization

- All art, audio, and font assets live in `assets/` with subfolder separation by type (`sprites/`, `audio/sfx/`, `audio/music/`, `fonts/`, `maps/`).
- Create subfolders when a folder exceeds ~15 files or has clear groupings (`sprites/enemies/`, `sprites/items/`, `sprites/ui/`).
- Never place art files alongside TypeScript source files.

### Engine Modularity

- One game system per file in `engine/` — no monolithic god managers.
- Engine files read from `data/` via imports. Engine files never define game content.

### Anti-Patterns

These are explicitly forbidden:

- **Monolithic App.tsx** — menus, game logic, and data all in one file.
- **Inline game data** — item/enemy arrays defined inside components or engine code.
- **God manager** — one engine file handling input, physics, combat, and inventory.
- **Duplicated UI** — same button/modal pattern reimplemented across screens.
- **Scattered assets** — art files mixed into `src/` outside the `assets/` tree.
- **Magic numbers** — bare literals (`health < 20`, `damage * 1.5`) instead of named constants from `data/constants.ts`.

---

## Input Conventions

All keyboard and input behavior must follow the standards in `docs/INPUT_CONVENTIONS.md`. That file is the source of truth — what follows is a high-level summary.

### Escape Key

Escape follows a strict priority chain — trigger the **first match** and stop:

1. **Close the topmost secondary window** (context menu, modal, dialog, dropdown, overlay).
2. **Cancel an in-progress action** (drag, selection, transient state).
3. **Open the pause menu** (if one exists and nothing else is open).
4. **No-op** if none of the above apply.

Only one layer closes per press. Never skip layers, never bind Escape to a destructive or forward-advancing action.

### Escape on Dialogs

- **Confirmation dialogs:** Escape = Cancel.
- **Yes/No where one option is safe:** Escape = the safe option (typically "No").
- **Yes/No where both options carry consequence:** Escape does nothing — force an explicit choice.
- **Info/OK dialogs:** Escape = OK (dismiss).

### Movement Keys

- If **WASD** is used for movement, **arrow keys must also work** for the same directions — unless arrow keys are reserved for a different purpose on that screen.
- Merge both key sets into one directional intent. Don't double-count simultaneous same-direction presses.
- Use `event.code` (physical key position) not `event.key` for movement bindings.
- If a screen breaks WASD/arrow equivalence, document why in a code comment.
