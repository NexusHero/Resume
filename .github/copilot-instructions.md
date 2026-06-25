# Copilot / AI agent instructions

These rules apply to any AI coding assistant (GitHub Copilot, Claude, etc.) working in this repo.

## Golden rules

- **Conventional Commits, English only.** `type(scope): summary`. Do **not** add
  `Co-Authored-By` trailers or attribution to AI tools.
- **PR-only.** Never push to `main`. Open a branch and a Pull Request.
- **Tests with every change.** New logic ships with unit/integration/acceptance tests;
  target ≥ 90 % coverage on core logic. Name tests `Subject_StateUnderTest_ExpectedBehaviour` (AAA).
- **Run the gate before pushing:** `./test.sh` (format + lint + tests) must pass; boot and drive
  the app for behavioural changes.

## Architecture & stack

- Backend lives in `core/` — **TypeScript**, layered (controller → service → repository),
  **Awilix** for dependency injection (no decorators / reflect-metadata), **pino** for logging,
  **zod** for validation. REST under `/api/v1`, documented by an **OpenAPI 3** spec.
- Keep modules single-responsibility (SOLID). Depend on interfaces, inject collaborators —
  no `new` for side-effecting collaborators (fs, git, Puppeteer) inside business logic.
- Web UIs are self-contained HTML under `ui_kits/` and `myjob/`.

## Documentation

- Architecture is **arc42** in `docs/architecture.md`. Modeling language is **UML**, authored in
  **PlantUML** (`docs/umls/*.puml`) and rendered to `.svg`. Update both prose and diagrams when
  behaviour or a building block changes.

## Language

- The product is **English end-to-end** — UI strings and API domain terms
  (`company`, `position`, …), not German (`firma`, `stelle`).
