// Type declarations for the preload API surface exposed via contextBridge.
//
// This file declares the shape of `window.gameAPI` so renderer code gets
// autocomplete and type checking when calling IPC methods.
//
// Keep this in sync with the contextBridge.exposeInMainWorld() call in
// src/preload.ts. When you add or remove a channel, update both files.

export interface GameAPI {
  // ── Renderer → Main (fire-and-forget) ──────────────────────────────────
  saveGame: (data: string) => void

  // ── Renderer → Main → Renderer (request / response) ───────────────────
  loadGame: () => Promise<string>

  // ── Main → Renderer (push events) ─────────────────────────────────────
  // Returns an unsubscribe function.
  onPause: (callback: () => void) => () => void
}

declare global {
  interface Window {
    gameAPI: GameAPI
  }
}
