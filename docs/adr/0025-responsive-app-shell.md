# ADR-0025 — Responsive app shell (matchMedia hook + drawer)

- **Status:** Accepted (first slice of roadmap E1; per-view density follows)
- **Relates to:** ADR-0023 (Vitest base — the net this rides on), ADR-0024 (MandatePipeline split — the board it makes touch-usable)

## Context

The recruiting kit was desktop-only: a fixed 244 px sidebar rail (`RecruitRail`)
that is always on, a top bar with a 220 px search, and a fixed viewport. On a
phone the rail eats most of the width and the header overflows. The roadmap (E1)
wants the suite usable on phones and tablets.

Two constraints shape the approach:

- **The kit styles inline** (`style={{…}}`), so a CSS `@media` rule cannot switch
  _layout_ — there are no layout classes to override. Responsiveness has to be
  driven from JS.
- **The board is already touch-usable.** `PipelineColumns` scrolls horizontally
  and every `MandateCard` has a stage `<select>`, so a card can be moved between
  stages by tapping the dropdown. HTML5 drag-and-drop (which does not fire on
  touch) is therefore a desktop-only enhancement, not a functional gap — no
  touch-drag library is needed.

## Decision

- **One breakpoint hook, `useViewport`.** A `matchMedia('(max-width: 768px)')`
  hook returning `{ isMobile }`; components branch their inline styles on it. It
  degrades to desktop when `matchMedia` is absent (jsdom, old engines) so it
  never throws. This is the kit's single responsive primitive; later E1 slices
  reuse it for per-view density. Breakpoint is 768 px: phones and small portrait
  tablets get the mobile posture; the 244 px rail still fits wider tablets, which
  stay desktop.
- **The rail becomes a drawer on mobile.** `RecruitRail` keeps the exact desktop
  layout above the breakpoint. Below it, the `<aside>` turns into an off-canvas
  drawer (fixed, `translateX(-100%)` → `0`) opened by a hamburger button in the
  header and closed by a tap on the backdrop or on any nav item. A **drawer**,
  not a bottom tab bar, because the nav has eight destinations — too many for a
  tab bar — and the drawer reuses the existing nav markup verbatim. The header
  drops the search on mobile (it would crowd the title; search stays reachable
  per view) and tightens its padding.
- **CSS handles only density.** `tokens/spacing.css` gets one `@media (max-width:
768px)` block that tightens `--pad-app` for the main content. Structural
  changes stay in JS; the token file only adjusts spacing.

## Consequences

- The suite is usable on a phone: full-width canvas, reachable navigation, a
  header that fits. Tablets keep the rail. No desktop pixels changed (the mobile
  branch is gated on `isMobile`).
- `useViewport` is the reusable seam for the rest of E1 — per-view work
  (dashboard/report grids to single column, modal density) branches on the same
  hook instead of re-deriving breakpoints.
- Locked by 9 Vitest tests (ADR-0023): the hook (matches / no-match / absent /
  subscribe-unsubscribe) and the rail (desktop search-no-hamburger, mobile
  hamburger-no-search, drawer open/close, nav-click closes + navigates).
- **Not yet responsive:** individual dense views (Workspace dashboard, Reports
  tables, some grids) can still overflow on a phone — they are the next E1
  slices, now unblocked by the hook. The touch-drag enhancement for the board is
  explicitly out of scope (the `<select>` covers touch).
