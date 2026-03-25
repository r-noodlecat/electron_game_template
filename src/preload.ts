// Preload script — runs in an isolated context before the renderer page loads.
//
// This is the ONLY place where Node.js / Electron APIs may be exposed to the
// renderer. Use contextBridge.exposeInMainWorld() to define a typed surface
// that renderer code can call safely via `window.<apiName>`.
//
// Security rules:
//   • Expose the minimum surface needed — avoid passing raw ipcRenderer to renderer.
//   • Always validate / sanitise arguments before forwarding to ipcMain.
//   • Keep channel names as string literals so they are easy to audit.
//
// Uncomment and extend the block below when you need main ↔ renderer communication.

/*
import { contextBridge, ipcRenderer } from 'electron';

// Type declarations live in src/game/global.d.ts so the renderer gets autocomplete.
contextBridge.exposeInMainWorld('gameAPI', {
  // ── Renderer → Main (fire-and-forget) ────────────────────────────────────
  // Example: window.gameAPI.saveGame(JSON.stringify(state));
  saveGame: (data: string): void => ipcRenderer.send('save-game', data),

  // ── Renderer → Main → Renderer (request / response) ──────────────────────
  // Example: const state = await window.gameAPI.loadGame();
  loadGame: (): Promise<string> => ipcRenderer.invoke('load-game'),

  // ── Main → Renderer (push events) ────────────────────────────────────────
  // Example: const unsubscribe = window.gameAPI.onPause(() => pauseGameLoop());
  //          // later: unsubscribe();
  onPause: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on('pause-game', handler);
    return () => ipcRenderer.removeListener('pause-game', handler);
  },
});
*/

