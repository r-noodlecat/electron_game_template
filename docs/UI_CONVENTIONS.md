# UI Conventions

This file defines standard UI behavior for the project. It is intended to be portable across Electron apps and to serve as a reference for both human developers and LLMs generating code. It is part of the project's convention documentation — read all documents in `docs/` for the complete picture.

Drop this file in the project root alongside the other convention documents.

---

## Window & Viewport

### Minimum Window Size

- The application assumes a **minimum window size of `1024×768`**. UI layouts do not need to accommodate anything smaller — it is acceptable to enforce this as the Electron `minWidth` / `minHeight`.
- Design and test layouts at `1024×768` as the floor. If something doesn't fit at this size, simplify the layout or use scrolling — do not shrink text below the minimum font sizes defined in **Font Sizing**.

### Scaling Philosophy

- **Readability over scalability.** On large or high-DPI screens, UI elements should grow or remain comfortable — never shrink to fit more on screen at the cost of legibility.
- Layouts may use flexible sizing (flex/grid with `fr` units, percentage widths) so panels fill available space, but text and interactive elements within those panels must respect the minimum size floors.
- If a panel has more content than can fit, use scrolling. Do not compress content to avoid scrolling.

---

## Font Sizing

Readable text is non-negotiable. The sizing system uses `rem` units anchored to a root font size, with hard pixel floors to guarantee legibility.

### Root Font Size & UI Scale

- Set the root font size on `<html>` (default: `16px`). All `rem` values derive from this.
- To implement a **UI scale slider**, adjust the root font size (e.g., `14px` for compact, `16px` for default, `18–20px` for large). Because everything is `rem`-based, the entire UI scales proportionally in one change.
- Even at the smallest scale setting, the root font size must never go below `14px` — this protects the minimum readability floor.

### Size Tiers

| Tier | Typical Use | Recommended Size | Hard Minimum |
| --- | --- | --- | --- |
| **Body / Description** | Item descriptions, dialog text, paragraphs, tooltip body text | `0.875–1rem` (14–16px at default root) | **`14px`** |
| **Labels / Captions** | Stat labels, slot names, small UI tags, secondary info | `0.75–0.875rem` (12–14px at default root) | **`12px`** |
| **Headings / Titles** | Panel titles, section headers, screen names | `1.25–1.75rem` (20–28px at default root) | **`18px`** |
| **Display / Hero** | Main menu title, splash screen text, large decorative text | `2rem+` (32px+ at default root) | No minimum — artistic discretion |

If a `rem` calculation would resolve to a value below the hard minimum, clamp it using `max()`: e.g., `font-size: max(14px, 0.875rem)`.

### Readable vs. Artistic Fonts

- **Artistic, decorative, or stylized fonts** (pixel fonts, fantasy scripts, hand-drawn faces, etc.) are reserved for **titles, headings, and display text only** — the tiers where text is large and brief.
- **Body text, descriptions, labels, stat values, tooltips, and any text the player reads for information** must use a **clean, highly legible font**. Prioritize readability: generous x-height, clear character differentiation, good hinting at small sizes.
- Never use an artistic font at body-size or below. If it's hard to read at `14px`, it doesn't belong on content the player needs to parse quickly.

### Font Implementation Notes

- Define size tiers as CSS custom properties so they can be referenced consistently:

```css
:root {
  font-size: 16px; /* Base — adjust this for UI scale */

  --font-size-body: max(14px, 0.875rem);
  --font-size-label: max(12px, 0.75rem);
  --font-size-heading: max(18px, 1.375rem);
  --font-size-display: 2rem;
}
```

- Pair these with the font-family tokens from **Typography Consistency** so that size and typeface are always defined together per element type.
- When the player adjusts the UI scale slider, only the root `font-size` on `<html>` changes. Everything else follows via `rem`, and the `max()` clamps ensure nothing drops below the floor.

---

## Tooltips

Tooltips are the primary mechanism for showing contextual help or labeling interactive elements.

### Tooltip Positioning

- Tooltips appear **below** the cursor, offset by `20px` vertically from the pointer's Y position.
- Horizontal alignment: the tooltip's **left edge aligns directly with the cursor's X position**. No centering logic — `left` is set to the raw cursor X coordinate.

### Follow Behavior

- Tooltips **follow the cursor** as it moves within the trigger element.
- The parent component tracks cursor position via `mousemove` and passes `{ x, y }` coordinates as a prop to the tooltip component.
- Update position on every `mousemove` event (throttle to animation frames via `requestAnimationFrame` if performance becomes an issue).

### Tooltip Timing

- **Show delay:** `400ms` after the cursor enters the trigger element. If the cursor leaves before the delay elapses, cancel the tooltip entirely.
- **Hide delay:** `0ms` — tooltip disappears immediately on `mouseleave`.
- **No fade-in/out animation** unless the specific context calls for it. Snap on, snap off.

### Viewport Clamping

- Before rendering, clamp the tooltip so it never overflows the visible window.
- If there isn't enough room below the cursor, flip it **above** the cursor (same horizontal logic, `20px` gap above).
- If there isn't enough room on the right, shift the tooltip left until its right edge has at least `8px` padding from the viewport edge. Mirror for the left side.

### Content Rules

- Tooltips may contain **rich structured content**: styled text, colored labels, tags, stat bonuses, and other inline data. No images or interactive elements (buttons, links, inputs).
- Text styling (color, font size) may vary per element inside the tooltip — for example, a name colored by rarity tier and a type tag with its own CSS class.
- No hard maximum width — let the tooltip's CSS class control sizing. Keep content concise but prioritize showing all relevant info (name, type, rarity, bonuses) over brevity.

### Tooltip Implementation Notes

- Tooltips are **React components**, rendered per-instance by the parent that owns the hover state. The parent conditionally renders the tooltip and passes the data item and cursor position as props.
- The tooltip component receives a `position: { x: number; y: number }` prop and applies it as inline `left` / `top` styles. If no position is provided, the tooltip renders in normal document flow (for static/embedded use cases).
- The tooltip component receives the data to display (e.g., an `Item` object) as a prop and handles its own internal layout — the parent does not need to format tooltip content.
- Use `role="tooltip"` on the tooltip's root element for accessibility.
- Null/empty states should be handled inside the tooltip component (e.g., rendering an "Empty" label when no data item is provided).

### Tooltip Reference Implementation

```typescriptreact
// Tooltip component pattern — see RelicTooltip for the canonical example.
interface TooltipProps {
  item: Item | null
  className?: string
  position?: { x: number; y: number }
}

// Positioning logic:
const style: CSSProperties | undefined = position
  ? { left: `${position.x}px`, top: `${position.y + 20}px` }
  : undefined
```

---

## Buttons

Buttons are the primary interactive controls across all UI panels.

### Button Appearance

- **Rounded corners:** All buttons use rounded corners (e.g., `border-radius: 6px`). The exact radius may vary by button size, but no button should have sharp 90° corners.
- **Drop shadow:** All buttons have a subtle drop shadow to give a slight sense of depth (e.g., `box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25)`). Adjust opacity/blur to fit the game's visual tone, but the shadow should never be heavy or distracting.
- **Text alignment:** Text is **always centered** within the button, both vertically and horizontally. Use `display: flex; align-items: center; justify-content: center` (or equivalent) — never rely on padding alone for centering.

### Button Hover

- Buttons **must** change color or tint on hover. Choose whichever approach (lighten, darken, saturate, or overlay) looks best for the game's palette. The change should be noticeable but not jarring.
- Any **usable** (enabled/clickable) button must highlight on mouseover by default. Hover highlight is part of the baseline affordance, not an optional enhancement.
- Transition: `120ms ease-out` (matches the global hover transition in **Hover & Focus States → General**).
- Use `cursor: pointer` on all clickable buttons.
- **Disabled buttons:** `cursor: not-allowed`, no hover color change, no active press effect. See **Disabled & Empty States** for full disabled styling.

### Button Implementation Notes

- Prefer a shared `<GameButton>` (or equivalent) component so that border-radius, shadow, centering, and hover behavior are defined once and reused everywhere.
- If a button contains an icon alongside text, the icon and text together should be centered as a group.

---

## Typography Consistency

Fonts must be applied **consistently by element type** across the entire UI.

- Once a font family, weight, and size are established for a given element type (buttons, headings, body text, labels, tooltips, etc.), **every instance** of that element type must use the same settings.
- For example: if buttons use `"Press Start 2P", 600, 14px`, then all buttons everywhere use that exact combination. Do not mix fonts or weights within an element category.
- Define font assignments at the top level (CSS variables, a theme object, or a shared stylesheet) so they can be updated in one place.
- If a new element type is introduced, decide its font settings once and document them — do not ad-hoc pick fonts per-component.

---

## Color System

All colors must be defined as **CSS custom properties** (or a shared theme object) with semantic names. Never hard-code hex/rgb values in individual components.

### Required Semantic Tokens

Define at minimum the following color roles. Actual values depend on the game's art direction:

- `--bg-primary` — main application/window background
- `--bg-surface` — panel, card, and container backgrounds (sits on top of `--bg-primary`)
- `--bg-surface-hover` — surface background on hover (slightly lighter/darker than `--bg-surface`)
- `--text-primary` — default readable text
- `--text-secondary` — de-emphasized or supplementary text
- `--text-muted` — faint labels, placeholders, disabled text
- `--accent` — primary interactive color (buttons, links, selection rings, highlights)
- `--accent-hover` — accent on hover (shifted tint of `--accent`)
- `--border` — default border color for panels, dividers, input fields
- `--danger` — destructive actions, errors, warnings
- `--success` — confirmations, positive feedback

### Color Rules

- Every component must pull colors from these tokens. If a new color is needed, add a new token — don't inline a one-off value.
- Rarity-tier colors (common, rare, epic, legendary, etc.) should also be defined as tokens (e.g., `--rarity-common`, `--rarity-rare`) so they're consistent across tooltips, borders, text, and glow effects.
- When creating hover/active variants, derive them from the base token (e.g., `filter: brightness(1.2)` on the base color, or a separate `--*-hover` variable) rather than picking a new color by eye.
- Prefer inheritance and token chaining so color updates cascade naturally. Example pattern: set component-level aliases like `--panel-accent: var(--accent)` and consume aliases in descendants, rather than re-declaring raw values.
- Prefer `color` inheritance and `currentColor` for text-adjacent visuals (icons, simple strokes, decorative glyphs) where appropriate. This keeps foreground changes centralized and prevents drift between text/icon colors.
- Scope overrides as narrowly as possible. If a local override is required, override the nearest semantic alias variable, not individual child element colors.

---

## Layout & Spacing

### Default Gap

- The default spacing (gap) between elements in any **grid or stack** (flex column, flex row, CSS grid) is **`5px`** unless a specific context requires otherwise.
- Apply this via `gap: 5px` on the flex/grid container rather than adding margins to individual children.
- Larger panels or top-level layout containers may use wider spacing, but `5px` is the baseline for in-panel element groups.

---

## Modals & Dialogs

Modals are full-attention interruptions — use them sparingly and only when the player must acknowledge or act on something before continuing.

### Backdrop

- Modals render over a **semi-transparent backdrop** that dims the rest of the UI. Use `background: rgba(0, 0, 0, 0.5–0.7)` — dark enough to clearly separate the modal from the background, but not fully opaque.
- The backdrop covers the entire viewport and sits at the **Overlays** z-index tier (`30–39`). The modal itself sits at the **Modals** tier (`40–49`).

### Modal Appearance

- Modals use `--bg-surface` for their background, `--border` for their outer edge, and the standard `border-radius` and `box-shadow` from the Buttons section (or slightly larger shadow for extra elevation).
- Modals are **centered** in the viewport, both vertically and horizontally.
- Maximum width should be set per-modal based on content, but no modal should exceed `90vw` or `600px` width for standard dialogs. Larger modals (e.g., full settings screens) can go wider but should still have clear margins from the viewport edges.

### Modal Animation

- **Open:** Fade in the backdrop (`opacity 0→1`, `150ms ease-out`) and scale the modal from `scale(0.95)` to `scale(1)` with a simultaneous fade (`150ms ease-out`).
- **Close:** Reverse the animation at the same speed. The backdrop fades last.

### Modal Closing

- **Escape key:** Always closes the topmost modal.
- **Backdrop click:** Closes the modal for non-critical dialogs (confirmations, info panels). For destructive or important dialogs (unsaved changes, delete confirmations), backdrop click should **not** dismiss — require an explicit button press.
- **Close button:** Every modal should have a visible close affordance (X button in the top-right corner, or a "Cancel" / "Close" button in the footer).

### Stacking

- Avoid stacking modals whenever possible — redesign the flow to use a single modal with multiple steps instead.
- If stacking is unavoidable, each new modal gets a higher z-index within the Modals tier, and the backdrop behind it dims the previous modal. Escape closes only the topmost modal.

### Modal Focus

- When a modal opens, focus moves to the first interactive element inside it (or the close button if there are no inputs).
- When a modal closes, focus returns to the element that triggered it.

### Modal Implementation Notes

- Render modals via a **portal** (`ReactDOM.createPortal`) attached to the document body, same as context menus, to avoid clipping from parent `overflow: hidden`.
- Prefer a shared `<Modal>` component that handles backdrop rendering, animation, escape/click-outside dismissal, and focus management internally. The parent provides the content and controls whether backdrop-click dismissal is enabled.

---

## Hover & Focus States

### Button Focus States

- All button hover rules (color shift, cursor, disabled behavior, transition timing) are defined in the **Buttons** section. Do not duplicate them here.

### General

- Transition duration for all hover effects: `120ms ease-out`.
- Keep hover effects subtle — they should confirm interactivity, not distract.

### Focus & Selection Indicators

- The **currently selected** interactive element (inventory slot, menu item, card, etc.) must have a clear visual indicator — a glowing border, highlight outline, or accent-colored ring. Use the theme's `--accent` color for consistency.
- Focus rings should be visible during **keyboard and gamepad navigation** but hidden on mouse click. Use `:focus-visible` (not `:focus`) to achieve this automatically.
- Selection indicators should use `box-shadow` or `outline` rather than `border`, so they don't shift layout when applied.
- If multiple selection is supported, selected items should have a persistent highlight (e.g., a tinted background or checkmark overlay) distinct from the hover state.

---

## Animations & Transitions

Animations should make the UI feel responsive and alive without slowing the player down.

### Micro-Interactions

- **Button press:** Apply a brief `scale(0.97)` on `:active` to give a tactile "push" feel. Duration: `80ms ease-out`. Return to `scale(1)` on release with `120ms ease-out`.
- **Panel open/close:** Panels and overlays should fade in with a slight vertical slide (`opacity 0→1`, `translateY(8px→0)`). Duration: `150ms ease-out`. Close is the reverse at the same speed.
- **List item appearance:** When items are added to a list dynamically (e.g., loot drops, inventory updates), stagger each item's entrance by `30–50ms` with a subtle fade + slide. Avoid animating bulk loads — only animate when a small number of items appear during gameplay.

### Defaults

- **Default easing:** `ease-out` for entrances, `ease-in` for exits.
- **Default duration:** `120–150ms` for micro-interactions (hovers, presses, toggles). `200–250ms` for larger transitions (panel slides, screen changes).
- **No animation on first paint.** UI elements present at load should render immediately — entrance animations are only for elements that appear after user interaction.

### Performance

- Only animate `transform` and `opacity` — these are GPU-composited and won't trigger layout recalculations.
- Avoid animating `width`, `height`, `margin`, `padding`, or `top`/`left` (use `transform: translate` instead).

---

## Cursor Styles

Use cursor styles consistently to communicate what an element does on click.

- `pointer` — any clickable interactive element (buttons, links, toggles, clickable cards).
- `grab` — draggable elements at rest. Switch to `grabbing` while actively dragging.
- `not-allowed` — disabled controls. Pair with reduced opacity and no hover effect.
- `default` — non-interactive content, static text, backgrounds.
- `crosshair` — precision targeting if the game has grid-based or spatial interactions.
- Never leave interactive elements with the default arrow cursor — if it's clickable, it gets `pointer`.

---

## Context Menus

Context menus are **custom-rendered React components** — never native OS menus. Native menus break visual immersion and can't be themed to match the game's art style.

### Triggering

- Attach a `contextmenu` event listener to any element that supports right-click actions. Call `e.preventDefault()` to suppress the default Electron/browser menu.
- The event's `clientX` / `clientY` give the spawn position for the menu.
- Only one context menu can be open at a time. Opening a new one closes the previous one immediately.

### Context Menu Positioning

- The menu's **top-left corner** spawns at the cursor position (the click's `clientX`, `clientY`).
- Apply the same **viewport clamping** rules as tooltips: if the menu would overflow the right edge, shift it left until its right edge has at least `8px` padding from the viewport. If it would overflow the bottom, flip it upward so its bottom edge aligns with the cursor Y. Mirror for left/top edges.
- Context menus use the **Dropdowns** z-index tier (`20–29`).

### Dismissing

- **Click outside:** Any click (left or right) outside the menu closes it immediately.
- **Escape key:** Pressing `Escape` closes the menu.
- **Item selection:** Clicking a menu item executes its action and closes the menu in the same frame.
- **Scroll:** Scrolling anywhere on the page closes the menu.
- **Window blur:** If the Electron window loses focus, close any open context menu.

### Context Menu Appearance

- Style context menus to match the game's panel aesthetic — use `--bg-surface` for the background, `--border` for the outer edge, and the standard `border-radius` and `box-shadow` from the Buttons section.
- Menu items highlight on hover using `--bg-surface-hover`. Use `cursor: pointer`.
- Destructive actions (delete, discard, etc.) should use `--danger` for their text color to make them visually distinct.
- Disabled menu items use `--text-muted`, `cursor: not-allowed`, and receive no hover highlight.
- Include a subtle separator (a thin `1px` line in `--border` color) between logical groups of actions.

### Context Menu Structure

- Keep context menus **flat** — no nested submenus. If an action needs further input (e.g., "Move to…" with a list of destinations), the menu item should open a separate modal or panel rather than spawning a submenu.
- Menu items are text-only or icon + text. No complex widgets, inputs, or toggles inside a context menu.
- Order actions by frequency of use, with destructive actions last and visually separated.

### Context Menu Implementation Notes

- Prefer a shared `<ContextMenu>` component that accepts an array of action definitions (`{ label, icon?, onClick, disabled?, danger? }`) and handles positioning, clamping, and dismiss behavior internally.
- The parent that spawns the menu is responsible for defining the action list — the `<ContextMenu>` component should be generic and reusable.
- Render the menu via a **portal** (`ReactDOM.createPortal`) attached to the document body so it isn't clipped by parent `overflow: hidden` containers.

---

## Notifications & Toasts

Toasts are brief, non-blocking messages that confirm an action or surface information without interrupting gameplay.

### Toast Position & Layout

- Toasts appear in the **bottom-right corner** of the viewport, offset `16px` from both edges.
- New toasts stack **upward** — the most recent toast is at the bottom, and older toasts shift up.
- Maximum **3 toasts visible** at once. If a 4th arrives, the oldest toast is immediately dismissed to make room.
- Toasts should not overlap or obscure critical game UI. If a specific screen needs a different toast position, override it per-screen rather than changing the global default.

### Toast Timing

- **Auto-dismiss:** `4 seconds` by default. Error toasts persist until manually dismissed (they are too important to auto-hide).
- **Hover to pause:** If the player hovers over a toast, its dismiss timer pauses. The timer resumes when the cursor leaves.
- **Manual dismiss:** All toasts can be dismissed early by clicking a small close (X) button.

### Types & Color Coding

- **Info** — neutral, uses `--text-primary` or `--text-secondary`. Default for general confirmations ("Settings saved", "Item equipped").
- **Success** — uses `--success` as an accent (left border, icon tint, or subtle background tint). For positive outcomes ("Upgrade complete", "Trade accepted").
- **Warning** — uses a warm amber/orange accent. For non-critical alerts ("Low inventory space", "Session expiring soon").
- **Error** — uses `--danger` as an accent. For failures or problems ("Connection lost", "Save failed"). Does **not** auto-dismiss.

### Toast Appearance

- Toasts use `--bg-surface` background, `--border` outer edge, rounded corners matching buttons, and a subtle drop shadow.
- Each toast type has a **colored left border** (`3–4px` wide) using its type color as the primary visual differentiator.
- Keep toast text brief — one or two lines maximum. If more detail is needed, the toast can include a "Details" link that opens a modal or panel.

### Toast Animation

- **Enter:** Slide in from the right (`translateX(100%)→0`) with fade, `200ms ease-out`.
- **Exit:** Fade out and slide right (`150ms ease-in`). Remaining toasts smoothly shift down to fill the gap (`150ms ease-out`).

### Toast Implementation Notes

- Prefer a global toast manager (context provider or lightweight store) that any component can call to show a toast: `showToast({ type: 'success', message: 'Item equipped' })`.
- Render the toast container via a **portal** at the document body level, at the **Raised** z-index tier (`10–19`) — toasts should sit above normal content but below dropdowns, modals, and tooltips.

---

## Disabled & Empty States

Every interactive element must have a clear disabled appearance, and every container must handle the "nothing here" case gracefully.

### Disabled Elements

- Reduce opacity to `0.45–0.5` to visually de-emphasize the element.
- Desaturate or grey out colored elements so they don't compete with active UI.
- Use `cursor: not-allowed`.
- Remove **all** hover and active effects — no color shift, no scale, no shadow change.
- If an element is disabled for a reason the player might not understand, pair it with a tooltip explaining why (e.g., "Requires Level 10", "Inventory full").

### Empty Containers

- Slots, lists, panels, and grids that can be empty should show a **placeholder state** rather than blank space.
- Use a subtle label like "Empty", "No items", or a dashed outline to indicate the space is intentional and interactive (if applicable).
- Empty slots in a grid should still render their border/background so the grid shape is preserved.
- Keep empty state styling muted (`--text-muted` color, dashed or faded borders) so it doesn't compete with populated elements.

---

## Scrollbar Styling

Custom scrollbars keep the UI feeling cohesive. Default OS scrollbars should be overridden wherever scrollable content appears.

### Scrollbar Appearance

- **Width:** Thin — `6–8px` for the scrollbar track.
- **Thumb:** Rounded (`border-radius: 4px`), using `--border` or a slightly lighter surface color. On hover, brighten slightly.
- **Track:** Transparent or a very faint tint of `--bg-surface`. Should be nearly invisible when the user isn't scrolling.
- **No arrow buttons** at the top/bottom of the scrollbar.

### Scrollbar Implementation

- Use `::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, and `::-webkit-scrollbar-track` pseudo-elements. Since this is an Electron app, WebKit prefixes are sufficient.
- Define scrollbar styles **globally** in the base stylesheet so every scrollable container inherits them automatically.

### Scrollbar Behavior

- **Only show when needed:** Use `overflow: auto` on all scrollable containers — never `overflow: scroll`. Scrollbars should not appear when content fits without scrolling.
- **Overlay, not inline:** Scrollbars should float on top of content rather than consuming layout width. Use `overflow: overlay` where supported (Electron/Chromium), falling back to `overflow: auto`. This prevents content from shifting or losing `6–8px` of width when a scrollbar appears.
- **Fade when idle:** The scrollbar thumb should fade out when the user stops scrolling and the cursor leaves the scrollable area. On hover or during active scroll, the thumb fades back in. This keeps panels clean when the player isn't interacting with the scroll.

### Scrollbar Reference Implementation

```css
/* Global scrollbar — add to base stylesheet */

/* Fade-on-idle: thumb is transparent by default, visible on container hover or active scroll */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
  transition: background 0.3s ease;
}

/* Show thumb when hovering the scrollable container or actively scrolling */
*:hover::-webkit-scrollbar-thumb,
*:active::-webkit-scrollbar-thumb {
  background: var(--border);
}
*:hover::-webkit-scrollbar-thumb:hover,
*:active::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Prefer overlay scrollbars so they don't eat layout width */
* {
  overflow: auto;
}
```

---

## Z-Index Layering

All z-index values must come from a defined tier system. Never hard-code arbitrary z-index values in individual components.

### Layer Tiers

| Tier | z-index Range | Use |
| --- | --- | --- |
| **Base** | `0` | Normal document flow, panels, content areas |
| **Raised** | `10–19` | Elements that float above siblings (sticky headers, floating action buttons) |
| **Dropdowns** | `20–29` | Select menus, dropdown panels, context menus, popovers |
| **Overlays** | `30–39` | Modal backdrops, dimming layers |
| **Modals** | `40–49` | Modal dialogs, confirmation windows |
| **Tooltips** | `50–59` | Tooltips (must always be the topmost non-critical layer) |
| **Critical** | `100+` | Dev tools, error overlays, crash screens — never needed in normal gameplay |

### Z-Index Rules

- Define these tiers as CSS variables or named constants (e.g., `--z-dropdown: 20`, `--z-modal: 40`, `--z-tooltip: 50`).
- If two elements within the same tier overlap, use specific values within that tier's range (e.g., `21` vs `22`), not a jump to a different tier.
- **Never use `z-index: 9999` or similar arbitrary values.** If something needs to be on top, it belongs in the correct tier.

---

## Loading & Skeleton States

Any UI element that depends on asynchronous data should show a clear loading state rather than appearing blank or popping in abruptly.

### Skeleton Placeholders

- While content is loading, render a **skeleton** of the expected layout — grey rounded rectangles roughly matching the shape of the content that will appear (text lines, image blocks, card outlines).
- Skeletons should have a subtle **shimmer animation**: a left-to-right highlight sweep using a CSS gradient on a `::before` or `::after` pseudo-element. Duration: `1.2–1.5s`, repeating.
- Skeleton elements use `--bg-surface-hover` (or a similarly muted color) as their base fill. They should blend into the panel, not stand out.

### Loading State Rules

- Prefer skeletons over spinners for any content area with a known layout (lists, grids, cards, stat blocks).
- Use a simple spinner only for indeterminate waits where the layout isn't predictable (e.g., "Connecting to server…").
- **Never show empty space** while loading — if data hasn't arrived, the skeleton should already be in place.
- Once data arrives, swap the skeleton for real content immediately (no fade needed — the skeleton already occupies the same space, so the transition feels seamless).

### Loading Skeleton Reference Implementation

```css
/* Shimmer animation for skeleton elements */
.skeleton {
  position: relative;
  overflow: hidden;
  background: var(--bg-surface-hover);
  border-radius: 4px;
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.06) 50%,
    transparent 100%
  );
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

---

## Drag & Drop

Drag-and-drop is used for rearranging items (inventory management, loadout building, list reordering, etc.). All drag interactions must follow consistent visual and behavioral rules.

### Initiating a Drag

- A drag begins on `mousedown` + mouse movement (not on click alone). Use a small movement threshold (`3–5px`) before committing to a drag to avoid accidental drags on normal clicks.
- The cursor changes to `grabbing` as soon as the drag is committed. At rest, draggable elements use `cursor: grab`.
- Draggable elements should have a subtle visual hint that they are movable — this can be as simple as the `grab` cursor, or a faint grip icon on hover. Don't rely solely on the cursor; not all players will notice it.
- Draggable elements **must** receive the same hover color/tint shift as buttons (see **Buttons → Button Hover**). Apply the same `120ms ease-out` transition and noticeable-but-not-jarring color change so draggable objects feel consistent with other interactive elements.
- Any currently draggable (enabled) element must highlight on mouseover by default. Non-draggable/disabled states must remove that highlight to avoid misleading affordances.

### Drag Preview (Ghost)

- While dragging, show a **semi-transparent preview** of the dragged element following the cursor. Opacity: `0.6–0.7`. The preview should match the element's original size and appearance — do not shrink or simplify it.
- The preview is positioned with its center (or the grab offset point) at the cursor. Use `position: fixed` and update on `mousemove`.
- The preview sits at the **Tooltips** z-index tier (`50–59`) so it renders above all normal UI.

### Drop Targets

- While the player is holding a valid draggable object, all valid drop targets should show a **subtle availability highlight** so the allowed destinations are visible at a glance.
- Valid drop targets must show a **clear visual highlight** when the dragged item hovers over them. Use `--accent` as a border or background tint with `0.15–0.2` opacity. The highlight should appear immediately (no delay).
- Use two emphasis levels when possible: a low-key baseline highlight for all valid targets during the drag, then a stronger active highlight for the specific valid target currently under the cursor.
- Invalid drop targets show **no highlight**. If it helps clarity, invalid targets can briefly show a `--danger`-tinted border or a subtle "not allowed" indicator, but this is optional — absence of a highlight is usually sufficient.
- When the dragged item leaves a drop target, the highlight removes immediately.

### Source Slot Placeholder

- The slot or position the item was dragged **from** should show a placeholder while the drag is active — a dashed outline, dimmed version, or empty-state styling (see **Disabled & Empty States → Empty Containers**). This tells the player where the item came from and what the slot will look like if the drag is cancelled.

### Dropping & Cancelling

- On a valid drop: the item snaps into the target position immediately (no animation needed — instant feedback feels more responsive for inventory actions).
- Unless a specific UI explicitly documents different behavior, the slot or position the item came from remains a **valid drop target** for the entire drag.
- On an invalid drop or release outside any target: the item **snaps back to its original slot or position**. A brief `150ms ease-out` snap-back animation is acceptable here.
- Pressing **Escape** during a drag cancels it and returns the item to its source, same as an invalid drop.

### Swap vs. Insert

- Define per-context whether dropping on an occupied slot **swaps** the two items or **inserts** the dragged item (pushing others aside). This should be consistent within a given container — don't mix swap and insert behavior in the same grid.
- If swapping, both items animate to their new positions simultaneously.

### Drag-and-Drop Implementation Notes

- Prefer a shared drag-and-drop hook or utility (e.g., a `useDrag` / `useDrop` pattern) that handles threshold detection, cursor management, preview rendering, and cancel behavior. Individual drag sources and drop targets should only need to define what data they carry and what happens on drop.
- Disable tooltips on draggable elements while a drag is active — the tooltip's `mousemove` tracking conflicts with the drag preview positioning.
- Apply `pointer-events: none` to the drag preview element itself so it doesn't intercept hover detection on drop targets beneath it (see **Pointer Events**).
- Use `user-select: none` on draggable elements to prevent accidental text selection during drag initiation.

---

## Pointer Events

`pointer-events` controls whether an element receives mouse/touch interactions. Use it deliberately to prevent invisible layers from stealing clicks or hover states.

### When to Apply `pointer-events: none`

- **Drag previews / ghost elements:** The semi-transparent preview that follows the cursor during drag must have `pointer-events: none` so the cursor can still detect drop targets beneath it.
- **Decorative overlays:** Any visual-only layer (glow effects, background particles, vignettes, ambient overlays) that sits above interactive content must have `pointer-events: none` so it doesn't block clicks or hover on elements underneath.
- **Disabled elements (selectively):** In some cases, disabled elements should still receive pointer events (to show a "why is this disabled?" tooltip on hover). In other cases, `pointer-events: none` is appropriate to make the element truly inert. Decide per-component, but document the choice.
- **Animation layers:** Any `::before` / `::after` pseudo-elements used for shimmer, glow, or transition effects should have `pointer-events: none` to avoid intercepting clicks meant for the real element.
- **Toast containers:** The toast stack container (the positioning wrapper) should have `pointer-events: none` with individual toast elements set to `pointer-events: auto`. This prevents the invisible container area from blocking interaction with the game UI behind it.

### Pointer Event Rules

- Default is `pointer-events: auto` (normal behavior). Only apply `pointer-events: none` when there is a specific reason.
- When using `pointer-events: none` on a container, set `pointer-events: auto` on any children inside it that still need to be interactive (e.g., the close button on a toast inside a `pointer-events: none` wrapper).
- Always comment the reason for `pointer-events: none` in the code — it's a common source of "why can't I click this?" bugs, and a comment makes debugging much faster.

---

## Related Documents

All convention documents live in `docs/`. When adding a new convention document, add it to each existing Related Documents table.

| Document | Covers |
| --- | --- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Process model, security design, build pipeline, IPC patterns |
| [`CODE_ORGANIZATION.md`](./CODE_ORGANIZATION.md) | File decomposition, screen structure, data extraction, engine modularity |
| [`COPILOT_TIPS.md`](./COPILOT_TIPS.md) | Quick-reference Copilot Chat prompts for common template tasks |
| [`FILE_CONVENTIONS.md`](./FILE_CONVENTIONS.md) | File naming, data formats, asset format rules, folder responsibilities |
| [`INPUT_CONVENTIONS.md`](./INPUT_CONVENTIONS.md) | Keyboard behavior, Escape key priority, movement key rules |
