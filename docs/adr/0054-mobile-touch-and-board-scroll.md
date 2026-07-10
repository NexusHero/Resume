# ADR-0054 — Mobile finish: touch targets, board scrolling, and safe-area insets

- **Status:** Accepted (completes the responsive pass — continues ADR-0025/0026/0027)
- **Relates to:** ADR-0025 (`useViewport` hook), ADR-0026 (dense/table views), ADR-0027 (editor/profile/modals stack), ADR-0028 (PWA), #202

## Context

ADR-0025/0026/0027 made every screen _lay out_ on a phone (shell drawer, tables
that scroll, editor/CV/modals that stack). Three ergonomic gaps remained before
the app was genuinely touch-grade — and the suite ships as a PWA and a Capacitor
shell, so they matter:

- **The kanban boards overflowed the body.** Five stage columns at ~210px never
  fit 390px. The mandate board already scrolled sideways inside itself; the
  Applications board (`PipelineBoard`) did not, so it pushed the whole page into a
  horizontal scroll.
- **Tap targets were desktop-sized.** The card stage `<select>` (~26px), the
  remove button (~22px), the drawer nav rows (~35px), the editor style-bar pills,
  and the Undo snackbar's action were all below the 44×44 CSS-px HIG minimum.
- **No safe-area handling.** Nothing used `env(safe-area-inset-*)`, so in the
  installed shell the rail, header, content, and the bottom snackbar could sit
  under the notch or the home indicator.

## Decision

Everything branches on the existing `useViewport` hook (`isMobile`, ≤768px) or on
inert `env()` insets, so desktop and the browser tab are unchanged.

- **Boards become horizontal snap-scrollers on mobile.** Both boards switch to
  `grid-template-columns: repeat(N, 82vw)` inside an `overflow-x: auto` container
  (`.board-scroll`) with `scroll-snap-type: x mandatory`; each column carries
  `scroll-snap-align: start` (`.board-col-snap`). 82vw leaves the next column
  peeking past the edge as the "there's more" affordance — no separate chrome.
  The board is its **own** scroll container, so the body never scrolls sideways.
- **≥44px tap targets on touch.** The card stage `<select>` and remove button,
  the drawer `NavItem`/theme-toggle/menu button, the logout pill, the editor's
  template/size/font/accent controls and tool pills, the Login mode tabs, and the
  Undo action all grow to a ≥44px min-height (and comfortable padding) when
  `isMobile` — spacing, not just glyph size. Desktop keeps its compact sizing.
- **Safe-area insets via `env()`.** The rail, mobile header, `<main>`, the login
  form, and the bottom snackbar pad with `max(<base>, env(safe-area-inset-*))`.
  `env()` resolves to 0 in a normal tab, so this is inert off-device.
- **`100dvh` for the shell height.** The root, the rail, and the login page use
  `100dvh` (with a `100vh` fallback) so the collapsing mobile URL bar doesn't
  leave a dead strip or clip the content.
- **Touch keeps the dropdown fallback.** Drag-and-drop stays a pointer
  enhancement; the stage `<select>` is the touch path for moving a card, now at a
  comfortable size.

## Consequences

- The core flow is touch-grade on a phone: drawer nav, boards that page by swipe,
  a stacked editor, and comfortable targets throughout. No horizontal body scroll
  on any main view at 390px.
- **Locked by a mobile Playwright project.** `playwright.config.ts` gains a
  `mobile-chromium` project (`devices['Pixel 5']` — chromium-backed, so no WebKit
  download) running `e2e/mobile.spec.ts`: the drawer nav walk with a
  no-horizontal-body-scroll assertion on each view, open-a-talent → open-editor,
  and the Applications board scrolling + a card's stage changing via the dropdown.
  The desktop project ignores the mobile spec; the mobile project runs only it.
- Touch sizing keys off `isMobile` (viewport width), not `pointer: coarse`. A
  touch laptop at desktop width keeps compact controls — an accepted trade for
  staying consistent with the kit's single responsive signal.
