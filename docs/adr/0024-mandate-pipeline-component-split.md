# ADR-0024 — Split the MandatePipeline god-component

- **Status:** Accepted
- **Relates to:** ADR-0022 (DocumentAiService split — the backend counterpart), ADR-0023 (the Vitest base that made this safe)

## Context

`MandatePipeline.jsx` was the frontend's largest god-component: ~720 lines in
one file where a single `MandatePipeline` function owned the Kanban board **and**
five self-contained feature modals — Add candidate, Find matches (with the AGG
bias check, neutral rewrite, per-candidate "why", and interview/prep launchers),
Interview kit, Candidate prep, and Company knowledge. It carried ~15 `useState`
slices and ~18 handlers, and the return was ~460 lines of modal JSX. It was the
frontend twin of the `DocumentAiService` god class (ADR-0022) and the named
target of roadmap item A2.

The blocker to splitting it — no fast component-level test net — was removed by
the Vitest base (ADR-0023). The e2e layer does **not** drive this component's
board or modals, so the split had to bring its own tests.

## Decision

- **Each feature modal becomes its own component that owns its feature state.**
  The five modals moved to `MandatePipelineModals.jsx`. Their state (pool fetch,
  match query/results, AGG check + rewrite, explanations, interview/prep, company
  knowledge + capture form) is genuinely local — it touches the board only via
  "reload after a candidate is added" — so each modal fetches on mount and talks
  to the parent through a minimal callback surface (`onClose`, `onAdded`,
  `onOpenTalent`). This dissolves the god _state_, not just the god render.
- **The orchestrator keeps only the board.** `MandatePipeline` now owns `cards`,
  `error`, and the drag state, plus the board handlers (`load`, `moveCard`,
  `dropCard`, `removeCard`); it renders `PipelineColumns` (extracted) and mounts
  the modals from `window`, reloading the board on add. It dropped from ~720 to
  ~230 lines.
- **A shared `ModalOverlay`** collapses the dimmed-backdrop + centered-card
  pattern the five modals each repeated inline — parameterised so the exact
  per-modal width, height, z-index and backdrop opacity are preserved (the split
  is pixel-neutral).
- **Interview/Prep stay presentational**, rendered by `FindMatchesModal` from its
  own `interview`/`prep` state, since that is where they are launched.
- **Behaviour-neutral.** No caller changes: `window.MandatePipeline` keeps its
  `{ mandate, onBack, onOpenTalent }` contract for `app.jsx`; the file follows
  the kit's `Object.assign(window, …)` publish and load-order convention
  (`MandatePipelineModals.jsx` is imported before the orchestrator in
  `main.jsx`). The production bundle is unchanged in size.

## Consequences

- The largest frontend file is gone; each modal is a small, independently
  renderable, independently testable unit. A2 is done.
- **Locked by 22 new Vitest tests** (ADR-0023): the board (`MandateCard`,
  `PipelineColumns` — open/move/remove/drop hints) and every modal (fetch-on-mount,
  filtering, add→notify→close, rank→add→"why", capture-form guard, loading/error
  states). These are the net the e2e layer never provided for this screen.
- The C1 design-system stub gained forwarding for `disabled`/`title`/`aria-*` so
  a test can assert a control's accessible/disabled state — a general
  improvement to the shared harness, not specific to this component.
- `AssistantService` (backend) remains the last named god candidate; the
  frontend `Editor` and `SettingsView` are the next-largest components should a
  further split be wanted.
