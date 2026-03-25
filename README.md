---
title: Electron Game Template
description: Electron + React + TypeScript + Vite desktop game template with VS Code and Copilot guidance
---

## Electron Game Template

A minimal [Electron](https://www.electronjs.org/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/) project template for building desktop games — pre-configured for VS Code with GitHub Copilot AI assistance.

---

## Documentation Map

Use these docs as the canonical references for architecture and conventions:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — process model, security boundaries, and build pipeline
- [CODE_ORGANIZATION.md](docs/CODE_ORGANIZATION.md) — decomposition patterns and modular structure
- [FILE_CONVENTIONS.md](docs/FILE_CONVENTIONS.md) — naming, folders, data, constants, and assets
- [INPUT_CONVENTIONS.md](docs/INPUT_CONVENTIONS.md) — keyboard rules and Escape handling priority
- [UI_CONVENTIONS.md](docs/UI_CONVENTIONS.md) — component behavior, styling, and interaction rules
- [COPILOT_TIPS.md](docs/COPILOT_TIPS.md) — practical prompting patterns for this template

---

## Tech Stack

| Layer | Technology | Purpose |
| ----- | ---------- | ------- |
| **Runtime** | [Electron](https://www.electronjs.org/) | Desktop app shell (Node.js main process + Chromium renderer) |
| **UI** | [React](https://react.dev/) | Component-based renderer UI (menus, HUD, overlays) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (strict mode) | Type-safe code across both processes |
| **Bundler** | [Vite](https://vite.dev/) + [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | Fast builds, HMR dev server, JSX/CSS bundling |
| **Testing** | [Vitest](https://vitest.dev/) | Unit/integration tests (Vite-native, fast, watch mode) |
| **Packaging** | [@electron/packager](https://github.com/electron/packager) | Produces standalone executables for distribution |

---

## Prerequisites

| Tool | Minimum version | Notes |
| ---- | --------------- | ----- |
| [Visual Studio Code](https://code.visualstudio.com/) | Latest stable | The only manual install required |
| [Node.js](https://nodejs.org/) | 18 LTS or later | Installed automatically by the setup script |
| [npm](https://www.npmjs.com/) | 9 or later | Bundled with Node.js |

> **Windows 10/11**: the setup script uses [winget](https://learn.microsoft.com/windows/package-manager/winget/) (pre-installed) to install Node.js automatically. No manual download needed.

---

## Quick Start — Automatic Setup

1. **Open the project folder in VS Code.**
2. VS Code will ask: *"This folder has tasks that run automatically. Allow?"* — click **Allow and Run**.
3. A terminal opens and the setup script:
   - Detects whether Node.js is installed; if not, installs it via `winget`.
   - Runs `npm install` to fetch all dependencies.

- Runs `npm run build` to verify the project builds successfully.

4. VS Code will also prompt you to install **recommended extensions** — click **Install All**.
2. Press **F5** to build and launch the game, or run `npm start` from the terminal.

That's it — zero manual installs beyond VS Code itself.

### Manual Fallback

If the automatic setup didn't run (e.g., you dismissed the prompt), you can trigger it anytime:

- **Terminal → Run Task → Setup** in VS Code, or
- Run directly in a terminal:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

Or install everything by hand:

```bash
# 1. Install Node.js from https://nodejs.org/ (or via winget)
winget install OpenJS.NodeJS.LTS

# 2. Clone the repository
git clone https://github.com/nickdarnell/electron_game_template.git
cd electron_game_template

# 3. Install dependencies
npm install

# 4. Build & launch
npm start
```

The app window opens with a dark screen showing a **bouncing box demo** — a minimal working game loop that you can replace with your own game. There is **no menu bar**, so your game can take over the full window chrome.

### Development (hot-reload)

```bash
npm run dev
```

This starts the Vite dev server for the game (with hot module replacement) and launches Electron pointing at it. Edit `src/game/` files and see changes instantly without restarting. Press `F12` inside the Electron window to open Chromium DevTools.

> For main process changes, stop and re-run `npm run dev`. The `watch` script (`npm run watch`) recompiles the main process on save if you prefer manual Electron restarts.

### Setup Troubleshooting (Windows)

If setup does not complete successfully, use this checklist:

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `winget` command not found | App Installer/winget unavailable | Install Node.js manually from [nodejs.org](https://nodejs.org/), then run `npm install` |
| Node installed but still not detected | PATH not refreshed in current terminal | Restart VS Code and run **Terminal → Run Task → Setup** again |
| Setup fails during build verification | TypeScript/Vite build error in current workspace state | Run `npm run build` manually, fix reported errors, then re-run setup |
| `npm install` fails with network/registry errors | Temporary connectivity or registry issue | Re-run `npm install` and verify npm registry/proxy configuration |

---

## Project Structure

```text
electron_game_template/
├── .github/
│   ├── copilot-instructions.md  # Persistent Copilot context & conventions
│   └── instructions/            # Focused instruction files applied by glob
├── docs/
│   └── ARCHITECTURE.md          # Process model, security design, module layout
├── src/
│   ├── main.ts                  # Electron main process (window, app lifecycle)
│   ├── preload.ts               # contextBridge template (IPC security boundary)
│   └── game/
│       ├── index.html           # Game window HTML (Vite entry point)
│       ├── index.css            # Global styles (imported by main.tsx)
│       ├── main.tsx             # React entry point (renders App into #root)
│       ├── App.tsx              # Root React component (game canvas + loop)
│       ├── global.d.ts          # Type declarations for window.gameAPI
│       └── vite-env.d.ts        # Vite client type declarations
├── tests/
│   ├── color-rules.test.ts      # Enforces semantic CSS color token rules
│   ├── demo.test.ts             # Sample Vitest test
│   ├── docs.test.ts             # Documentation integrity tests
│   └── samplecontent/           # Test fixtures for docs/content checks
├── scripts/
│   ├── package.ps1              # Source packaging (zip for sharing)
│   └── setup.ps1                # First-time Windows setup (installs Node.js)
├── dist/                        # Compiled output (git-ignored)
├── .vscode/
│   ├── extensions.json          # Recommended VS Code extensions
│   ├── settings.json            # Workspace settings
│   ├── launch.json              # Debug configurations (main + renderer)
│   └── tasks.json               # Build / watch / setup tasks
├── vite.config.ts               # Vite + Vitest configuration
├── tsconfig.json                # TypeScript config (renderer + tests)
├── tsconfig.main.json           # TypeScript config (main + preload)
└── package.json
```

### Build Architecture

The project uses **two separate TypeScript compilation targets**:

- **Main + preload** → compiled by `tsc` (CommonJS for Node.js) via `tsconfig.main.json`
- **Renderer** → bundled by Vite (ESNext modules for Chromium) using `tsconfig.json`

This separation means the renderer gets Vite's fast HMR, CSS bundling, and asset handling, while the main process stays on standard `tsc` output that Electron expects.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a detailed explanation of the two-process model, IPC patterns, and recommended module layout for a full game.

---

## Setting Up GitHub Copilot

GitHub Copilot is the recommended AI pair-programmer for this project. It integrates directly into VS Code and is aware of your full codebase.

### 1 — Install the extensions

When you open the project in VS Code you will see a notification asking you to install the **recommended extensions**. Click **Install All** to get:

| Extension | ID | Purpose |
| --------- | -- | ------- |
| **GitHub Copilot** | `GitHub.copilot` | AI code completions, chat, and Agent mode |
| HVE Core All | `ise-hve-essentials.hve-core-all` | Additional instruction packs, agents, and skills |
| TypeScript Next | `ms-vscode.vscode-typescript-next` | Latest TypeScript language service |
| ESLint | `dbaeumer.vscode-eslint` | Linting |

Alternatively install them manually from the Extensions panel (`Ctrl+Shift+X` / `⌘⇧X`) by searching for the IDs above.

### 2 — Sign in to GitHub Copilot

1. Click the **Copilot icon** in the VS Code status bar (bottom right).
2. Choose **Sign in to use GitHub Copilot** and authenticate with your GitHub account.
3. Ensure your account has an active [GitHub Copilot subscription](https://github.com/features/copilot) (free tier available for individuals).

---

## Using the GitHub Copilot Agent (Agent Mode)

**Agent mode** lets Copilot autonomously plan, write, and iterate across **multiple files** in response to a single high-level prompt — the most effective way to build out a game idea quickly.

### Enable Agent Mode

1. Open Copilot Chat: `Ctrl+Alt+I` / `⌘⌥I` (or click the chat icon in the Activity Bar).
2. In the chat input dropdown change the mode from **Ask** to **Agent** (`@workspace` becomes the implicit context).
3. You can also trigger it via the Command Palette: **GitHub Copilot: Open Agent Panel**.

### Workflow: Describe → Prototype → Iterate

| Step | What you do | Copilot's role |
| ---- | ----------- | -------------- |
| **Describe** | Explain your game idea in plain English | Asks clarifying questions, produces a plan |
| **Prototype** | Accept the plan or adjust it | Generates code across all relevant files |
| **Iterate** | Review diffs, give feedback | Applies targeted fixes until you're happy |

### Starter prompts

```text
I want to build a top-down dungeon crawler with keyboard movement and collision detection.
Start by replacing the demo in App.tsx with a Player class, a tile-based map, and keyboard input.
```

```text
Add a main menu scene with a "Start Game" button that transitions to the gameplay scene.
```

```text
Add an IPC channel so the renderer can read and write save-game JSON files via the main process.
Use the contextBridge pattern documented in preload.ts.
```

```text
Add a SceneManager class in src/game/SceneManager.ts that can register and switch between scenes.
```

### Tips

- Keep prompts **goal-oriented** ("implement X so that Y") rather than prescriptive about implementation details.
- Reference the files Copilot should modify: "update `main.ts` and create a new `Player.ts`".
- Use **`/explain`** in chat to understand any unfamiliar code Copilot generates.
- Use **`/fix`** with a selected code block to have Copilot diagnose and repair errors.
- The `.github/copilot-instructions.md` file gives Copilot **persistent context** about conventions, patterns, and security rules every time it is invoked in this project.

---

## npm Scripts

| Command | Description |
| ------- | ----------- |
| `npm start` | Build everything, then launch Electron |
| `npm run dev` | Vite dev server + Electron with hot-reload |
| `npm run build` | Full build (main process via `tsc` + renderer via Vite) |
| `npm run build:main` | Compile main + preload only (`tsc`) |
| `npm run build:renderer` | Bundle renderer only (`vite build`) |
| `npm run watch` | Recompile main process on every save |
| `npm test` | Run all tests once via Vitest |
| `npm run test:watch` | Run Vitest in watch mode (re-runs on file changes) |
| `npm run lint` | Lint `src/` and `tests/` with ESLint |
| `npm run cook` | Build + package for the current platform into `out/` |
| `npm run package` | Create a source zip (excludes build artifacts and secrets) |

### Packaging Modes

| Mode | Command | Output | Primary use |
| ---- | ------- | ------ | ----------- |
| App package | `npm run cook` | `out/electron-game-template-<platform>-<arch>/` | Ship a runnable desktop build |
| Source archive | `npm run package` | `out/electron_game_template_<date>.zip` | Share editable project source |

---

## Testing

Tests use [Vitest](https://vitest.dev/), which shares the Vite config for zero extra setup.

### Running Tests

```bash
# Single run (CI-friendly)
npm test

# Watch mode — re-runs affected tests on save
npm run test:watch
```

### Known Test Status

At the moment, the full suite includes two known failing checks in `tests/color-rules.test.ts`:

- `ensures fill and text tokens never share the same color in interactive states`
- `guards room slot hover against white-on-white regressions`

These failures are currently unrelated to README and docs updates. If you're only validating documentation changes, run:

```bash
npx vitest run tests/docs.test.ts
```

### Writing Tests

Place test files in the `tests/` directory using the `*.test.ts` or `*.spec.ts` naming convention:

```typescript
// tests/math.test.ts
import { describe, it, expect } from 'vitest';
import { clamp } from '../src/game/utils/math';

describe('clamp', () => {
  it('clamps a value below the minimum', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('clamps a value above the maximum', () => {
    expect(clamp(200, 0, 100)).toBe(100);
  });

  it('returns the value when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
});
```

Vitest supports:

- **Snapshot testing** for complex output validation
- **DOM testing** with `jsdom` or `happy-dom` environments (add `// @vitest-environment jsdom` at the top of a test file)
- **Coverage reporting** via `vitest run --coverage`

The `cook` command produces a standalone, runnable folder in `out/` (e.g. `out/electron-game-template-win32-x64/`) — everything a user needs to run the game, with no installer required. Run it via **Terminal → Run Task → Cook** in VS Code, or directly from the command line.

> **Note:** The `cook` script excludes `node_modules` by default. This template currently bundles renderer output into `dist/`, so packaged output works without shipping `node_modules`. If your game adds runtime Node/Electron module loading from `node_modules`, remove that ignore pattern so required packages are included.
