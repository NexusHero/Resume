# ADR-0027 — Responsive CV profile, editor, and form modals

- **Status:** Accepted (E1 slice 3 — completes the core responsive pass; continues ADR-0025/0026)
- **Relates to:** ADR-0025 (`useViewport` hook), ADR-0026 (dashboard/table views)

## Context

After the shell (ADR-0025) and the dashboard/report views (ADR-0026), the
remaining desktop-only screens were the document-heavy ones: the `TalentProfile`
CV, the `Editor`, and the form modals. Each carried a fixed multi-column layout
that overflows a phone:

- `TalentProfile` — the CV renders as `1fr 300px` (document + side rail) with the
  document itself split `264px 1fr` (dark identity/skills column + paper).
- `Editor` — `380px 1fr` (a 380 px form pane beside the live preview); the 380 px
  fixed track alone exceeds a phone's width, and the toolbar row never wraps.
- Form modals (Mappe, RecordForm, Outreach) — `1fr 1fr` field grids inside a
  ~92 vw modal, cramping every field to ~150 px.

## Decision

All branch on the existing `useViewport` hook; every change is gated on
`isMobile`, so desktop is untouched.

- **The CV stacks.** On mobile `1fr 300px` → `1fr` (side rail below the document)
  and the CV's own `264px 1fr` → `1fr` (identity/skills panel on top, then the
  experience/education paper) — the standard single-column mobile résumé, not a
  squashed two-up.
- **The editor stacks and scrolls, keeping both panes mounted.** On mobile
  `380px 1fr` → `1fr` (form, then live preview), the outer container drops its
  `height: 100%` so the page scrolls naturally, and the toolbar gets
  `flex-wrap: wrap` + full-width. Crucially the panes **stack** rather than
  toggle: the preview stays mounted, so its `ResizeObserver` fit-to-width scaling
  keeps working (a tab-toggle would unmount it and break the one-shot scale
  effect). No refs or effects were touched.
- **Modals drop to one column.** The `1fr 1fr` field grids become `1fr` on
  mobile so each field gets the modal's full width.

## Consequences

- The core app is now usable end-to-end on a phone: shell, dashboards, tables,
  the candidate CV, the document editor, and the forms. E1's primary pass is
  complete.
- Locked by 6 Vitest tests: the editor's two-pane grid + toolbar wrap across
  breakpoints, the CV column stack, and a form modal's column collapse. The
  shared test setup gained a no-op `ResizeObserver` polyfill (jsdom lacks it) so
  observer-using components like the editor render in tests — a general infra
  improvement.
- **Deferred, and now the only responsive gap:** `SettingsView`'s list rows use
  `minmax(0, 1fr) … auto` tracks that shrink acceptably on a phone, so they were
  left as-is; a dedicated stack can follow if the settings screens prove cramped
  in use. The board's touch drag-and-drop remains intentionally unimplemented
  (the stage `<select>` covers touch).
