---
description: "UI component patterns, color system, typography, tooltips, modals, toasts, drag-and-drop, and visual conventions"
applyTo: "src/game/**/*.{tsx,ts,css}"
---

# UI Component Conventions

When working on renderer UI code, follow the standards in [docs/UI_CONVENTIONS.md](../../docs/UI_CONVENTIONS.md). That file is the authoritative source — this summary provides quick-reference rules for the most common patterns. When in doubt, consult the full doc. For the complete set of project conventions, see all documents in the `docs/` folder.

---

## Window & Fonts

- Minimum window: `1024×768`. Do not design for smaller viewports.
- Readability over scalability — use `rem` units with `max()` clamps to enforce hard pixel floors.
- Font size floors: body text `14px`, labels `12px`, headings `18px`. Use `font-size: max(14px, 0.875rem)` pattern.
- Artistic/decorative fonts are for titles and headings only. Body text, labels, tooltips, and descriptions use a clean legible font.
- Font family, weight, and size must be consistent per element type (all buttons share one style, all headings another). Define in CSS variables or a shared theme.
- UI scale slider: adjust only the root `font-size` on `<html>`. Everything follows via `rem`. Never set root below `14px`.
- If content would extend beyond a panel or viewport, make that region scrollable. Never leave required UI or content inaccessible off-screen.

## Color System

- All colors come from semantic CSS variables: `--bg-primary`, `--bg-surface`, `--bg-surface-hover`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-hover`, `--border`, `--danger`, `--success`.
- Rarity tiers also get tokens: `--rarity-common`, `--rarity-rare`, etc.
- Never hard-code hex/rgb values in components. If a new color is needed, add a token.
- Derive hover/active variants from the base token (`filter: brightness()` or a separate `--*-hover` variable).

## Layout & Spacing

- Default `gap: 5px` on all flex/grid containers unless a specific context requires more.
- Use the `gap` property on the container, not margins on children.
- Keep element positions stable when conditional content appears or disappears. Do not let helper text, validation text, or similar UI shift nearby controls unless that movement is intentional.
- If a layout intentionally shifts, add a nearby `layout-shift-intentional:` code comment explaining why.

## Buttons

- Rounded corners (`border-radius: 6px`), subtle drop shadow (`box-shadow: 0 2px 4px rgba(0,0,0,0.25)`).
- Text always flex-centered: `display: flex; align-items: center; justify-content: center`.
- Hover: mandatory color/tint shift, `120ms ease-out` transition, `cursor: pointer`.
- Active: `scale(0.97)`, `80ms ease-out`.
- Disabled: `cursor: not-allowed`, opacity `0.45–0.5`, no hover/active effects.
- Prefer a shared `<GameButton>` component.

## Tooltips

- Per-instance React components. Parent owns hover state and cursor tracking.
- Pass `position: { x: number; y: number }` and data item as props.
- Position: `left: position.x`, `top: position.y + 20`. No centering logic.
- Show delay: `400ms`. Hide delay: `0ms`. No fade animation.
- Viewport clamp: flip above if no room below, shift horizontally with `8px` edge padding.
- Rich content allowed (colored text, rarity tags, stat bonuses). No interactive elements.
- `role="tooltip"`. Handle null/empty state inside the component.

```typescriptreact
const style: CSSProperties | undefined = position
  ? { left: `${position.x}px`, top: `${position.y + 20}px` }
  : undefined
```

## Modals & Dialogs

- Semi-transparent backdrop (`rgba(0,0,0, 0.5–0.7)`), backdrop at z-index Overlays tier (`30–39`), modal at Modals tier (`40–49`).
- Centered in viewport. Max width `90vw` or `600px` for standard dialogs.
- Open: fade + `scale(0.95→1)`, `150ms ease-out`. Close: reverse.
- Close triggers: Escape (always), backdrop click (non-destructive only), close button (always present).
- Focus moves into modal on open, returns to trigger on close.
- Avoid stacking modals — prefer multi-step flows within one modal.
- Render via `ReactDOM.createPortal` to document body.

## Context Menus

- Custom-rendered React components — never native OS menus.
- Spawn at cursor (`clientX`, `clientY`). Viewport clamp (same rules as tooltips).
- Z-index: Dropdowns tier (`20–29`).
- Dismiss on: click outside, Escape, item selection, scroll, window blur.
- Only one context menu open at a time.
- Flat structure — no nested submenus. Use a modal for multi-step actions.
- Style: `--bg-surface` background, `--border` edge, hover with `--bg-surface-hover`. Destructive actions use `--danger` text color.
- Render via portal. Prefer a shared `<ContextMenu>` component accepting action definitions.

## Notifications & Toasts

- Position: bottom-right, `16px` from edges. Stack upward, max 3 visible.
- Auto-dismiss: `4s`. Error toasts persist until manually dismissed. Hover pauses timer.
- Types: info (neutral), success (`--success`), warning (amber), error (`--danger`).
- Each toast has a colored left border (`3–4px`) matching its type.
- Enter: slide from right + fade, `200ms ease-out`. Exit: fade + slide right, `150ms ease-in`.
- Toast container: `pointer-events: none`. Individual toasts: `pointer-events: auto`.
- Z-index: Raised tier (`10–19`).
- Global toast manager: `showToast({ type, message })`. Render via portal.

## Hover & Focus States

- All hover transitions: `120ms ease-out`.
- Selected elements: glowing border or `--accent`-colored ring via `box-shadow` or `outline` (not `border` — avoids layout shift).
- Use `:focus-visible` (not `:focus`) for keyboard/gamepad focus rings, hidden on mouse click.
- Multi-selection: persistent tinted background or checkmark overlay, visually distinct from hover.

## Animations & Transitions

- Default easing: `ease-out` for entrances, `ease-in` for exits.
- Micro-interactions (hover, press, toggle): `120–150ms`. Larger transitions (panels, screens): `200–250ms`.
- Only animate `transform` and `opacity` — never `width`, `height`, `margin`, `padding`, or `top`/`left`.
- No animation on first paint. Entrance animations only for elements appearing after user interaction.
- Stagger list item entrances by `30–50ms` for dynamic additions. Skip stagger on bulk loads.

## Cursor Styles

- `pointer` — clickable elements. `grab`/`grabbing` — draggable elements. `not-allowed` — disabled controls. `default` — non-interactive content.
- Never leave interactive elements with the default arrow cursor.

## Disabled & Empty States

- Disabled: opacity `0.45–0.5`, desaturated, `cursor: not-allowed`, no hover/active effects. Add explanatory tooltip if reason isn't obvious.
- Empty containers: show placeholder (label, dashed outline). Preserve grid shape with rendered-but-empty slots. Use `--text-muted`, dashed/faded borders.

## Scrollbar Styling

- Custom scrollbars: `6px` wide, rounded thumb (`border-radius: 4px`), transparent track, no arrow buttons.
- `overflow: auto` only — never `overflow: scroll`. Overlay mode (float on content, don't consume layout width).
- Use scrollbars whenever content would otherwise overflow the visible window or container. Important content must stay reachable.
- Fade when idle: thumb transparent by default, visible on container hover or active scroll.
- Define globally in base stylesheet.
- Prefer a shared scroll-region utility class so overflow behavior stays consistent across panels.

## Z-Index Layering

- Base `0` → Raised `10–19` → Dropdowns `20–29` → Overlays `30–39` → Modals `40–49` → Tooltips `50–59` → Critical `100+`.
- Define as CSS variables: `--z-dropdown: 20`, `--z-modal: 40`, `--z-tooltip: 50`.
- Never use `z-index: 9999` or arbitrary values. If it needs to be on top, assign it to the correct tier.

## Loading & Skeleton States

- Skeleton placeholders for known layouts (lists, grids, cards). Shimmer animation: `1.2–1.5s`, left-to-right gradient sweep.
- Spinners only for indeterminate waits with unknown layout.
- Never show empty space while loading.
- Swap skeleton for real content immediately on data arrival (no fade).

## Drag & Drop

- Movement threshold `3–5px` before committing a drag. `cursor: grab` at rest, `grabbing` while dragging.
- Draggable elements must receive the same hover color/tint shift as buttons (`120ms ease-out` transition).
- Ghost preview: semi-transparent (`0.6–0.7` opacity), full-size, `position: fixed`, z-index Tooltips tier. `pointer-events: none` on the ghost.
- Valid drop targets: highlight with `--accent` border/tint immediately. Invalid: no highlight.
- Source slot: show placeholder (dashed outline or empty state) during drag.
- Valid drop: snap immediately. Invalid drop or Escape: snap back with `150ms ease-out`.
- Disable tooltips during active drag. Use `user-select: none` on draggable elements.
- Prefer a shared `useDrag`/`useDrop` hook pattern.

## Pointer Events

- Apply `pointer-events: none` to: drag ghosts, decorative overlays, animation pseudo-elements (`::before`/`::after`), toast containers.
- Set `pointer-events: auto` on interactive children inside `pointer-events: none` containers.
- Always comment the reason for `pointer-events: none` in code.
