# Input Conventions

This document defines standard keyboard and input behavior for the project. It is part of the project's convention documentation — read all documents in `docs/` before implementing input handling or UI flows that respond to key presses.

---

## Escape Key

Escape is the universal "back out" key. Its behavior follows a strict priority chain — when pressed, it triggers the **first matching action** from the top of this list and stops:

### Priority Chain

1. **Close the topmost secondary window.** Any open tooltip, context menu, dropdown, modal, dialog, or overlay that is not the primary game screen. "Topmost" means highest z-index among currently open secondary elements. Only one thing closes per press — the player presses Escape again to close the next layer down.
2. **Cancel an in-progress action.** If the player is mid-drag, mid-selection, or in any transient interaction state, Escape cancels it and returns to the prior state (e.g., snap a dragged item back to its source slot).
3. **Open the pause menu** (if the game has one). When no secondary window is open and no action is in progress, Escape opens the pause/system menu. Pressing Escape again while the pause menu is open closes it (same rule — it's now the topmost secondary window).
4. **No-op.** If none of the above apply (e.g., the player is on the main menu with nothing else open), Escape does nothing.

### Escape on Dialogs

- **Confirmation dialogs** (e.g., "Are you sure you want to delete this?"): Escape acts as **Cancel**. The dialog closes with no action taken — equivalent to clicking the Cancel button.
- **Yes/No dialogs** where one option is safe and the other is destructive or irreversible: Escape acts as the **safe option** (typically "No"). For example, "Discard unsaved changes? Yes / No" — Escape selects "No" and closes the dialog.
- **Yes/No dialogs** where both options carry consequence or neither is clearly the "safe" choice: Escape **does not** select either option. It closes the dialog with no action, same as Cancel. If there is no Cancel button and both choices have real consequences, Escape should do nothing — force the player to choose explicitly.
- **Info/acknowledgment dialogs** (single "OK" button): Escape dismisses the dialog, equivalent to clicking OK.

### Rules

- Every component that opens a secondary window or dialog must register an Escape key handler that closes or cancels it.
- Escape handlers must respect the priority chain. A modal's Escape handler should only fire if that modal is the topmost layer — not if a context menu is open on top of it.
- Never bind Escape to a destructive or irreversible action. Escape always means "go back", "close", "cancel", or "choose the safe option."
- Never bind Escape to an action that advances state forward (confirming a purchase, starting a match, submitting a form). Escape is always a retreat.

---

## Movement Keys

### WASD and Arrow Key Equivalence

When a screen uses **W/A/S/D** for directional movement (character movement, cursor movement, camera panning, or any spatial navigation), the **arrow keys must also work** for the same actions by default.

- **Up Arrow = W**, **Left Arrow = A**, **Down Arrow = S** (corrected: **Down Arrow = S**, **Right Arrow = D**).
- Both sets of keys are active simultaneously. The player can use whichever they prefer, or mix them.
- Input handling must not double-count simultaneous presses of the same direction (e.g., holding W and Up Arrow together should not move at double speed).

### Exception: Arrow Keys Reserved

If a screen or context **reserves the arrow keys for a different purpose** — such as navigating a menu, cycling through inventory slots, scrolling a list, or controlling a separate UI element — then arrow keys do **not** mirror WASD.

- This exception must be intentional and documented. When implementing a screen that breaks the WASD/arrow equivalence, add a code comment explaining what the arrow keys do instead and why they don't mirror WASD.
- The reverse also applies: if arrow keys are the primary movement input and WASD is reserved for another purpose (e.g., hotkeys), document it the same way.

### Implementation Notes

- Read both WASD and arrow key states in the input handler and merge them into a single directional intent (e.g., `movingUp = keys.has('KeyW') || keys.has('ArrowUp')`). Do not duplicate movement logic for each key set.
- Use `event.code` (physical key position) rather than `event.key` (character output) for movement keys. This ensures correct behavior on non-QWERTY keyboard layouts — `KeyW` is always the top-left key in the letter block regardless of what character it produces.
- Define key bindings as named constants or a mapping object, not scattered string literals. This makes it easy to add rebinding later.

---

## Related Documents

All convention documents live in `docs/`. When adding a new convention document, add it to each existing Related Documents table.

| Document | Covers |
| --- | --- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Process model, security design, build pipeline, IPC patterns |
| [`CODE_ORGANIZATION.md`](./CODE_ORGANIZATION.md) | File decomposition, screen structure, data extraction, engine modularity |
| [`COPILOT_TIPS.md`](./COPILOT_TIPS.md) | Quick-reference Copilot Chat prompts for common template tasks |
| [`FILE_CONVENTIONS.md`](./FILE_CONVENTIONS.md) | File organization, naming, data formats, asset rules |
| [`UI_CONVENTIONS.md`](./UI_CONVENTIONS.md) | Visual patterns: tooltips, modals, buttons, animations, z-index, colors |
