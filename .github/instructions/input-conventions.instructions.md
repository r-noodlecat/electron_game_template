---
description: "Keyboard handling, Escape key priority chain, WASD/arrow key equivalence, and movement input conventions"
applyTo: "src/game/**/*.{ts,tsx}"
---

# Input Conventions

When implementing keyboard handling, key bindings, or any input-driven behavior in the renderer, follow the standards in [docs/INPUT_CONVENTIONS.md](../../docs/INPUT_CONVENTIONS.md). That file is the authoritative source — this summary provides quick-reference rules for the most common patterns. When in doubt, consult the full doc. For the complete set of project conventions, see all documents in the `docs/` folder.

---

## Escape Key Priority Chain

When Escape is pressed, trigger the **first match** and stop:

1. **Close the topmost secondary window** (tooltip, context menu, dropdown, modal, dialog, overlay).
2. **Cancel an in-progress action** (drag, selection, transient state).
3. **Open the pause menu** (if one exists and nothing else is open).
4. **No-op** if none of the above apply.

Only one thing closes per Escape press. Never skip layers.

## Escape on Dialogs

- **Confirmation dialogs:** Escape = Cancel (close, no action taken).
- **Yes/No — one option is safe:** Escape = the safe option (usually "No").
- **Yes/No — both options carry consequence:** Escape does nothing. Force an explicit choice.
- **Info/OK dialogs:** Escape = OK (dismiss).
- **Never** bind Escape to a destructive or forward-advancing action.

---

## Movement Keys

- If WASD is used for movement, **arrow keys must also work** for the same directions unless arrows are reserved for another purpose.
- Merge both key sets into a single directional intent — don't duplicate movement logic.
- Don't double-count simultaneous same-direction presses (W + Up Arrow ≠ 2× speed).
- Use `event.code` (`KeyW`, `ArrowUp`) not `event.key` for layout-independent bindings.
- If arrow keys are reserved for a different purpose on a given screen, add a code comment explaining why WASD/arrow equivalence is broken.

```typescript
// Merged directional intent — both WASD and arrows feed the same state
const movingUp = keys.has('KeyW') || keys.has('ArrowUp');
const movingLeft = keys.has('KeyA') || keys.has('ArrowLeft');
const movingDown = keys.has('KeyS') || keys.has('ArrowDown');
const movingRight = keys.has('KeyD') || keys.has('ArrowRight');
```
