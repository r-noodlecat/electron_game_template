---
description: "Process boundary rules, IPC patterns, security constraints, and build pipeline for all source files"
applyTo: "src/**/*.{ts,tsx}"
---

# Architecture Conventions

When adding or modifying any source file, follow the standards in [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md). That file is the authoritative source — this summary provides quick-reference rules for the most critical constraints. When in doubt, consult the full doc. For the complete set of project conventions, see all documents in the `docs/` folder.

---

## Process Boundary — Never Blur It

There are three processes. Each has a strict role; crossing the boundary is a bug.

| File | Process | Allowed |
| ---- | ------- | ------- |
| `src/main.ts` | Node.js (Main) | Electron + Node.js APIs only. Never touches the DOM. |
| `src/preload.ts` | Isolated | Only file that calls `contextBridge.exposeInMainWorld()`. |
| `src/game/**` | Chromium (Renderer) | Browser APIs + React only. No Node.js imports. |

- Renderer code accesses main-process features exclusively through `window.gameAPI`.
- Never import Node.js modules (`fs`, `path`, `child_process`, etc.) in `src/game/`.
- Never import Electron renderer APIs (`ipcRenderer`, `shell`, etc.) directly in `src/game/` — wrap them through `preload.ts`.

## Security — Non-Negotiable

- `nodeIntegration: false` and `contextIsolation: true` — always. Never change these.
- Never disable or loosen the Content Security Policy set in `main.ts`.
- Never use `eval()`, `new Function()`, or dynamic `require()` in renderer code.
- Validate and sanitise all data received via IPC in every `ipcMain.handle()` handler.
- Never expose the raw `ipcRenderer` object — wrap each channel in a named, typed function.

## IPC Patterns

All IPC is wired through `preload.ts`. Use the correct pattern for the communication direction:

```typescript
// One-way renderer → main:
saveGame: (data: string) => ipcRenderer.send('save-game', data)

// Two-way renderer → main → renderer:
loadGame: () => ipcRenderer.invoke('load-game')

// Push events main → renderer (return an unsubscribe function):
onPause: (cb: () => void): (() => void) => {
  const handler = () => cb();
  ipcRenderer.on('pause-game', handler);
  return () => ipcRenderer.removeListener('pause-game', handler);
}
```

- Declare the `window.gameAPI` type in `src/game/global.d.ts`.
- Wrap all `window.gameAPI` promise calls in try/catch in the renderer.
- In `main.ts`, catch errors inside `ipcMain.handle` handlers — return structured error responses, never raw exceptions.

## Build Pipeline

```text
src/main.ts + src/preload.ts  →  tsc -p tsconfig.main.json  →  dist/main.js + dist/preload.js
src/game/**                   →  vite build                  →  dist/game/index.html + assets
```

- The `dist/` directory is the only runnable output — never commit it.
- Do not add CommonJS `require()` calls in renderer files; use ES module imports.
- Do not use the `remote` module — it is deprecated in modern Electron.
