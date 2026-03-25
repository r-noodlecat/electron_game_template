# Architecture

This document explains how the Electron game template is structured and why. Understanding it helps you—or an LLM—make sound architectural decisions when extending the project. It is part of the project's convention documentation — read all documents in `docs/` for the complete picture.

---

## Process Model

Electron runs two separate JavaScript processes. They cannot share memory; they communicate via IPC.

```text
┌────────────────────────────────────────────────────────────┐
│  Main Process  (Node.js)                                   │
│  src/main.ts                                               │
│  • Creates BrowserWindow(s)                                │
│  • Handles OS integration (menus, dialogs, file system)    │
│  • Responds to ipcMain.handle() / ipcMain.on() calls       │
└───────────────────────┬────────────────────────────────────┘
                        │  IPC (contextBridge)
┌───────────────────────▼────────────────────────────────────┐
│  Preload Script  (isolated Node.js + limited Electron)     │
│  src/preload.ts                                            │
│  • Only file that may call contextBridge.exposeInMainWorld │
│  • Defines the typed API surface the renderer can access   │
│  • Acts as a security boundary / mediator                  │
└───────────────────────┬────────────────────────────────────┘
                        │  window.gameAPI.*
┌───────────────────────▼────────────────────────────────────┐
│  Renderer Process  (Chromium)                              │
│  src/game/main.tsx + index.html                             │
│  • Full DOM and Canvas / WebGL APIs available              │
│  • Runs the game loop, input handling, and rendering       │
│  • Cannot import Node.js modules directly                  │
└────────────────────────────────────────────────────────────┘
```

---

## File Responsibilities

| File | Process | Responsibility |
| ---- | ------- | -------------- |
| `src/main.ts` | Main | Window lifecycle, app events, IPC handlers for OS operations |
| `src/preload.ts` | Isolated | Exposes safe, typed APIs to renderer via `contextBridge` |
| `src/game/index.html` | Renderer | HTML shell, CSP meta tag, loads the React app |
| `src/game/main.tsx` | Renderer | React entry point — renders App into #root |
| `src/game/App.tsx` | Renderer | Game entry point — canvas, game loop, input |

---

## Security Design

### Context Isolation

`nodeIntegration: false` and `contextIsolation: true` (set in `main.ts`) ensure renderer code runs in a standard browser sandbox. Renderer code cannot call `require()` or access Node.js globals.

### Content Security Policy

`main.ts` sets a strict CSP via Electron's `session.webRequest` API in production builds:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

This prevents:

- Loading scripts from external URLs
- Inline `<script>` tags
- `eval()` and `new Function()`

The CSP is applied in the main process rather than in an `index.html` meta tag so it can be skipped during development — Vite injects inline scripts for hot module replacement that a strict CSP would block.

### Preload / contextBridge Pattern

The `preload.ts` script is the only safe channel between the renderer and main process. It:

1. Runs before the page loads, in a privileged but isolated context
2. Selectively exposes functions (never the raw `ipcRenderer` object)
3. Can validate/sanitise arguments before forwarding to `ipcMain`

```text
Renderer                Preload               Main
  │                       │                    │
  │  window.gameAPI       │                    │
  │  .loadGame()    ────► │  ipcRenderer       │
  │                       │  .invoke()   ────► │  ipcMain
  │                       │                    │  .handle()
  │  Promise<string> ◄─── │ ◄──────────────────│
```

---

## Build Pipeline

```text
src/main.ts + src/preload.ts  →  tsc -p tsconfig.main.json  →  dist/main.js + dist/preload.js
src/game/**                   →  vite build                  →  dist/game/index.html + assets
```

The `dist/` directory is the runnable output. `electron .` starts from `dist/main.js` (set as `"main"` in `package.json`).

---

## Adding a New Feature

### 1. Renderer-only feature (no OS access needed)

Add code in `src/game/` — new TypeScript files, canvas helpers, etc. No changes to `main.ts` or `preload.ts` required.

### 2. Feature that needs OS/Node.js access

1. Add an `ipcMain.handle('channel-name', ...)` handler in `src/main.ts`
2. Expose it in `src/preload.ts` via `contextBridge.exposeInMainWorld`
3. Call it from the renderer via `window.gameAPI.methodName()`
4. Add a type declaration in `src/game/global.d.ts` (create if needed)

### 3. New window or dialog

Create and manage the new `BrowserWindow` entirely in `src/main.ts`. Give it its own preload if it needs IPC access.

---

## Recommended Module Layout for a Full Game

```text
src/
├── main.ts                   ← Window management, file I/O IPC handlers
├── preload.ts                ← contextBridge API surface
└── game/
    ├── index.html            ← HTML shell + CSP
    ├── main.tsx              ← React entry point (renders App into #root)
    ├── App.tsx               ← Root component (canvas + game loop)
    ├── global.d.ts           ← TypeScript declarations for window.gameAPI
    ├── engine/
    │   ├── GameLoop.ts       ← requestAnimationFrame loop + delta time
    │   ├── Input.ts          ← Keyboard / mouse / gamepad state
    │   ├── SceneManager.ts   ← Switches between screens (menu, gameplay…)
    │   ├── Scene.ts          ← Base scene interface
    │   └── entities/
    │       ├── Entity.ts     ← Base entity (position, update, draw)
    │       └── Player.ts     ← Player entity
    └── utils/
        ├── math.ts           ← Vec2, lerp, clamp, random helpers
        └── assets.ts         ← Image / audio loading helpers
```

---

## Technology Choices

| Decision | Rationale |
| -------- | --------- |
| **Electron** | Cross-platform desktop target with full hardware access |
| **TypeScript strict** | Catches bugs early; essential for LLM-generated code review |
| **Vite** | Fast bundler with HMR for the renderer; shares config with Vitest |
| **No game framework** | Maximum flexibility — use Phaser, Babylon.js, or plain Canvas/WebGL |
| **React** | Component-based UI for menus, HUD, and overlays alongside canvas rendering |
| **Zero runtime deps (beyond React)** | Reduces supply-chain attack surface; keeps clone fast |
| **CommonJS output** | Required by Electron's Node.js main process |

---

## Copilot Instructions Layer

The project ships a set of VS Code instruction files in `.github/instructions/`. VS Code loads each file automatically when a source file matches its `applyTo` glob pattern, feeding the rules to Copilot without requiring manual references in prompts.

### How activation works

Each `.instructions.md` file declares an `applyTo` field in its YAML frontmatter. When you open or edit a file whose path matches the glob, VS Code silently attaches the instruction content to the Copilot context for that session.

```text
.github/
├── copilot-instructions.md          ← Always-active workspace hub; summarises all conventions
└── instructions/
    ├── architecture.instructions.md      ← applyTo: src/**/*.{ts,tsx}
    ├── code-organization.instructions.md ← applyTo: src/game/**/*.{ts,tsx}
    ├── file-conventions.instructions.md  ← applyTo: src/game/**/*.{ts,tsx,json,css}
    ├── input-conventions.instructions.md ← applyTo: src/game/**/*.{ts,tsx}
    └── ui-conventions.instructions.md    ← applyTo: src/game/**/*.{tsx,ts,css}
```

### File responsibilities

| File | `applyTo` scope | Covers |
| ---- | --------------- | ------ |
| `architecture.instructions.md` | All `src/` TypeScript | Process boundaries, IPC patterns, security constraints, build pipeline |
| `code-organization.instructions.md` | `src/game/` TypeScript | Decomposition rules, screen extraction, data separation, engine modularity |
| `file-conventions.instructions.md` | `src/game/` TS + JSON + CSS | File naming, folder roles, game data formats, asset rules, constants |
| `input-conventions.instructions.md` | `src/game/` TypeScript | Keyboard handling, Escape chain, WASD/arrow equivalence, movement input |
| `ui-conventions.instructions.md` | `src/game/` TypeScript + CSS | Component patterns, color system, typography, tooltips, modals, toasts |

### Extending the instructions system

When adding a new convention document to `docs/`:

1. Create a matching `.instructions.md` file in `.github/instructions/` with the appropriate `applyTo` glob.
2. Add the filename to the `## Active Instructions Files` list in `.github/copilot-instructions.md`.
3. The `docs.test.ts` test suite enforces these links automatically — `npm test` will catch any gaps.

---

## Related Documents

All convention documents live in `docs/`. When adding a new convention document, add it to each existing Related Documents table.

| Document                                         | Covers                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| [`CODE_ORGANIZATION.md`](./CODE_ORGANIZATION.md) | File decomposition, screen structure, data extraction, engine modularity |
| [`COPILOT_TIPS.md`](./COPILOT_TIPS.md)           | Quick-reference Copilot Chat prompts for common template tasks           |
| [`FILE_CONVENTIONS.md`](./FILE_CONVENTIONS.md)   | File naming, data formats, asset format rules, folder responsibilities   |
| [`INPUT_CONVENTIONS.md`](./INPUT_CONVENTIONS.md) | Keyboard behavior, Escape key priority, movement key rules               |
| [`UI_CONVENTIONS.md`](./UI_CONVENTIONS.md)       | Visual patterns: tooltips, modals, buttons, animations, z-index, colors  |
