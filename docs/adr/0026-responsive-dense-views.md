# ADR-0026 — Responsive dense views (dashboard + tables)

- **Status:** Accepted (E1 slice 2; continues ADR-0025)
- **Relates to:** ADR-0025 (the `useViewport` hook + responsive shell this builds on)

## Context

ADR-0025 made the app _shell_ responsive but left the dense content views
overflowing on a phone. Two kinds of breakage remained on the recruiter's most-hit
screens (Workspace dashboard, Reports, Placements):

- **KPI/section grids** with a hard column count — `repeat(4, 1fr)` stat rows and
  a `1fr 1fr` dashboard split — squash to unreadable slivers on a 360 px screen.
- **Data tables** whose rows use fixed-px columns (`… 96px 104px 116px 116px`,
  `… 110px 110px 110px`). Those ~430 px / ~330 px of fixed track exceed a phone's
  width and push the page into horizontal body scroll.

## Decision

Branch the layout on the existing `useViewport` hook — no new mechanism:

- **Grids collapse, not squash.** On mobile the KPI rows go `repeat(4, 1fr)` →
  `repeat(2, 1fr)` and the dashboard's `1fr 1fr` split stacks to `1fr`. Auto-fill
  card grids (`repeat(auto-fill, minmax(280px, 1fr))`) already reflow, so they are
  left alone.
- **Tables scroll sideways instead of misaligning.** Each fixed-column table
  (mandates, placements) is wrapped, on mobile only, in an `overflow-x: auto`
  container with a `min-width` on the inner track. The columns keep their shape
  and the table scrolls within its card — the page body never scrolls sideways.
  Stacking each row's cells was rejected: it misaligns the columnar meaning
  (fee vs. status vs. counts) and reads worse than a scoped scroll. Desktop is
  untouched (`overflow-x: visible`, `min-width: auto`).

## Consequences

- The dashboard and reporting screens are usable on a phone: two-up KPIs,
  stacked panels, and tables that scroll in place rather than breaking the page.
  Every change is gated on `isMobile`, so desktop pixels are unchanged.
- Locked by 5 Vitest tests: the KPI grid template (2 vs 4 columns), the dashboard
  section stack, and the presence/absence of the table scroll wrapper across
  breakpoints.
- **Still deferred** (next E1 slices, now clearly scoped): the `TalentProfile` CV
  document (its `264px 1fr` layout is the résumé's own visual identity and needs a
  deliberate mobile treatment, not a reflex stack), the `Editor` (fixed `380px`
  editing pane), and the `Settings`/form modals. The architecture debt note tracks
  them.
