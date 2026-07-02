# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### Added

- **Skills that power Matching** — the Add-talent form takes comma-separated skills, and
  `GET /talents` returns each talent's `effectiveSkills` (stored skills merged with what
  their documents prove, canonicalized), so Matching scores against the full picture. The
  recruiter's own pinned profile derives its skills from their saved documents.
- **"My documents" persist** — the recruiter's own resume/cover letter (keyed by their user
  id, which has no talent record) can now be loaded, saved and given attachments: document
  and attachment operations accept the signed-in user as a valid subject.
- **Self-hosted webfonts** — Inter, Space Grotesk and JetBrains Mono ship as committed
  woff2 files (`design/fonts/`); no request to Google Fonts leaves the browser (DSGVO),
  typography works offline, and the CSP no longer allows any third-party origin.
- **Honest sample-data notice** — `GET /jobs` reports which source produced the postings;
  Matching shows a "Sample postings" hint when no live job source is configured.
- **Dated cover letter** — the exported PDF letter carries a "City, date" line whose locale
  follows the letter's language (German Anschreiben → German date), matching the preview.

### Changed

- **Inbox hidden** — the placeholder Inbox view is out of the navigation until it is wired
  to a real mail source.

- **Job-language AI output** — generated candidate-facing documents (pitch, outreach,
  cover letter, CV suggestions) follow the **language of the job ad / candidate material**
  (German posting → German application), detected deterministically offline
  (`domain/language`) and stored on the mandate; both the LLM prompt and the deterministic
  fallback honour it. Recruiter-facing AI helpers are unified to English.
- **Document translation (EN↔DE)** — a "Translate → EN/DE" control in the Editor generates
  the other-language variant of a candidate's resume + cover letter and stores it alongside
  the primary set (idempotent; requires an AI provider — without a key the API asks for one
  instead of fabricating a translation).
- **Provider transparency** — pitch/outreach results show which backend produced the draft
  ("AI · claude" vs "Template · no AI").
- **KI-Qualität** — a **skill canonicalization taxonomy** (`domain/skill-taxonomy`) that
  unifies variants (React.js / ReactJS / react → React) before matching and display, and a
  **grounding self-check** (`domain/grounding`) that flags factual claims (numbers-with-unit,
  known skills) in AI-drafted pitch/outreach the CV + mandate don't support — surfaced in the
  Editor as a "nicht belegte Angaben" warning.
- **Documentation set** — a retroactive [requirements](docs/requirements.md) catalogue
  (FR/NFR), [use cases](docs/use-cases.md), and an [architecture decision log](docs/adr)
  (ADR-0001…0010); `docs/architecture.md` refreshed to the current recruiting/AI suite; the
  README's features + REST API surface brought current.

### Changed

- **Quality-audit pass (roadmap 0.9)** — a three-dimension review (clean code,
  architecture conformance, UX walkthrough) plus the resulting fixes: real personal data
  and dead sample constants removed from the shipped bundle; the talent profile now loads
  the candidate's real documents/attachments instead of always claiming none exist; the
  Matching manual-mode filter fixed; the remaining German UI chrome translated; the CV
  parse prompt anglicized and the `suggest` feature made language-aware; the
  `DocumentAiService` LLM scaffold collapsed into `runLlm()`/`generateAndMeter()`; five
  duplicated `candidateFacts` builders unified; `Editor.jsx` split into focused modules;
  scope/user naming drift and dead exports cleaned up. Branch coverage rose to ~91.5 %.

- **SOLID cleanup (`core/`)** — split PDF merging out of `PdfRenderer` into its own `PdfMerger`
  port + `PdfLibMerger` adapter (ISP), and moved `slug()` into `domain/slug.ts` (SRP). Pure
  refactor, no behaviour change; branch coverage on the service rose to 100%.
- **English end-to-end** — the launcher and the **myJob** apps (recruiting workspace + applicant
  app) are now fully English (UI labels, sample data and copy). The CV / cover-letter pages keep
  their EN/DE toggle.

### Added

- **UI acceptance tests** with **Playwright** (`npm run test:e2e`) — boot the real server and
  drive the launcher and the recruiting workspace in a browser; wired into CI.
- Tag-triggered **release** builds a downloadable, runnable per-OS artifact (compiled
  `core/dist` + static app; `npm ci --omit=dev && npm start`).
- **TypeScript backend (`core/`)** — a layered, SOLID rewrite of the REST API: controller →
  service → repository, **Awilix** dependency injection (no decorators), **pino** structured
  logging, **zod** request validation, **RFC 9457 problem+json** errors, versioned routes under
  **`/api/v1`** (plus `/api/v1/health`), and an **OpenAPI 3** contract (`core/openapi.yaml`).
- Test suite: Jest unit + integration + **acceptance (supertest)** with **≥ 90 % coverage**
  (currently 100 % lines/functions, ~96 % branches) and **Stryker** mutation testing configured.
- arc42 building-block + runtime documentation and a building-block UML diagram.
- Project governance: GitHub Actions CI (format, lint, tests, conventional-commit check),
  CodeQL, security (npm audit + dependency review), docs (PlantUML render check) and a
  tag-triggered release pipeline that publishes a downloadable, runnable artifact.
- Community files: `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, issue forms and a PR template.
- Git hooks (`scripts/hooks/`): `pre-commit` runs format + lint + tests; `commit-msg` enforces
  Conventional Commits. Installable via `npm run hooks:install`.
- Tooling: Prettier, ESLint (flat config), EditorConfig, `.nvmrc`.
- [arc42](https://arc42.org) architecture documentation skeleton (`docs/architecture.md`) with
  the first PlantUML system-context diagram.
- **We now merge only via Pull Request — no direct pushes to `main`.**

<!-- Add a new entry when cutting a release:

## [1.0.0] - YYYY-MM-DD

### Added
### Changed
### Fixed
### Removed
-->
