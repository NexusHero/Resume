# ADR-0023 — Frontend unit/component test base with Vitest

- **Status:** Accepted
- **Relates to:** ADR-0001 (hexagonal, SOLID), ADR-0012 (docs acceptance tests), ADR-0022 (god-class split — the same treatment is owed to the frontend god-components)

## Context

The backend has a deep Jest suite (≈ 1000 unit + acceptance tests, 90 % branch
gate) and the UI has a Playwright layer (`e2e/ui.spec.ts`) that boots the real
server and drives the recruiting kit in a browser. What was missing is the layer
between them: a **fast, isolated frontend unit/component test** that renders a
single component or exercises a single helper in jsdom without a server or a
browser.

That gap is the blocker for A2 — splitting the frontend god-components
(`MandatePipeline` at ~720 lines, `Editor`, `SettingsView`). Playwright is too
coarse and slow to guide a refactor of a component's internal structure; a
structural split needs a test net at the component level, which did not exist.
PR6 deferred that split for exactly this reason.

The recruiting kit has an unusual module model that any test harness must honour:
each file references a **global `React`** (classic JSX — `React.createElement`,
`React.useState`), reads the design-system bundle off
`window.MyJobDesignSystem_f3658e`, publishes its own symbols with
`Object.assign(window, { … })`, and is loaded in a fixed order by `main.jsx`. It
is a Vite project, built with esbuild's classic JSX transform.

## Decision

- **Vitest for the frontend layer; the backend stays Jest.** The kit is a Vite
  project, so Vitest reuses the same transform pipeline the app builds with —
  the strongest reliability argument given the global-React model. The server
  keeps its Jest suite (Node env). The two runners map to two genuinely
  different environments (jsdom vs node), which even Jest models as separate
  "projects"; this is the right tool per environment, not framework drift.
- **Classic JSX transform, pinned.** Vite 8 transforms JSX with oxc, so the
  Vitest config sets `oxc.jsx = { runtime: 'classic', pragma:
'React.createElement', pragmaFrag: 'React.Fragment' }` — verified to match the
  shipped bundle (all `createElement`, no `jsx-runtime`). A test can never pass
  under a transform the production build does not use.
- **A setup file reproduces `main.jsx`'s pre-conditions in jsdom:** it installs
  `window.React`/`ReactDOM`, registers jest-dom matchers, and stubs the
  design-system bundle with a Proxy whose every member is a passthrough
  component (so a test need not load the whole `_ds_bundle.js`). An
  `installDesignSystem(overrides)` helper lets a test provide a real
  implementation for a member the passthrough cannot fake.
- **The `Object.assign(window, …)` publish is the test seam.** A test imports a
  kit file for its side effect and reads the symbol under test off `window` —
  no production code change, no new exports.
- **No coverage gate yet.** C1 lands the harness plus the first exemplar tests
  (pure aggregates in `data.js`; the `DataStates` render + retry-click). Web
  coverage is reported, not enforced; it rises as A2 splits the god-components.
  The server's 90 % Jest gate is untouched. `npm run test:web` runs the suite
  and is wired into the `verify` CI job.

## Consequences

- A2 is unblocked: the god-components can now be split against a fast
  component-level net instead of only Playwright.
- Two test runners now live in the repo. The cost is one extra config and CI
  step; the benefit is transform parity and jsdom isolation that Jest would have
  to reproduce with more plumbing (a jsdom project + a .jsx transform for the
  global-window model). `npm test` (Jest, server) and `npm run test:web`
  (Vitest, kit) stay independent — different roots, no overlap.
- Frontend tests live under `design/**`, which lint and Prettier already treat
  as design-system-owned (ignored); they inherit that exemption, consistent with
  the kit files they cover. They follow the same
  `Subject_StateUnderTest_ExpectedBehaviour` naming as the backend suite.
- The passthrough design-system stub is deliberately shallow. A component that
  uses a DS member in a non-render way must override it via
  `installDesignSystem` — an intentional, explicit seam rather than a
  best-effort fake that hides breakage.
