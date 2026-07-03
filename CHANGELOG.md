# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### Fixed

- **The AI provider choice is per user and survives restarts** — it is now
  persisted on the account instead of held in server memory, which had two
  traps: a restart silently reset everyone to the default (your Gemini key
  then went unused — template mode without a hint), and one user switching
  flipped the provider for the whole team. Switching now requires being
  signed in.
- **Gemini replies are no longer truncated** — Gemini 2.5 spends "thinking"
  tokens inside `maxOutputTokens`, which cut structured replies mid-JSON and
  silently degraded features to their templates; thinking is now disabled for
  these short, structured tasks (verified live: ATS, prep and suggest come
  back complete).
- **Candidate prep no longer falls back for lack of tokens** — its reply is
  the largest structured output (questions + STAR scaffolds + rationale), so
  its budget rose from 1200 to 2000 tokens.
- **Template fallbacks are diagnosable** — when an LLM reply arrives but
  fails its schema (truncated or malformed JSON), a warning is logged; before,
  that fallback was indistinguishable from "no provider configured".
- **CV import is no longer destructive** — the parsed CV is staged as a
  suggestion (Apply/Discard) like the AI tailor, and empty parsed contact
  fields never overwrite values the recruiter already typed.
- **Rejected API keys surface honestly** — an invalid Claude/Gemini key now
  yields a 502 problem with "check your key in Settings" instead of a naked
  500; features with a deterministic fallback keep falling back silently.
- **The Attachments tab's Upload button works** (it was decorative; uploads
  previously only worked inside the dossier modal).
- **The topbar search actually searches** — it filters the Talent Pool,
  Mandates and Placements lists.
- Offline outreach no longer renders "your profile as the role" when no role
  is known — the phrase is dropped instead.
- The letter preview no longer shows a leading comma before the date when the
  sender has no location.

### Changed

- The decorative notification bell and the always-empty Applications board
  (and its Reports funnel card) are hidden until they have a real data source
  — same call as the Inbox.
- **arc42 documentation brought current** — both UML diagrams (system context,
  building blocks) redrawn for the recruiting suite (they still showed the
  original applicant-only system), and the stale sections refreshed: per-user
  provider choice + call-usage in the runtime view, API contract / self-hosted
  assets / cost transparency as cross-cutting concepts, ADR 0011/0012 in the
  decision log, release pipeline in the deployment view.

### Added

- **Email integration** — drafted outreach can be sent straight from the app
  ("Send email" in the outreach modal, via the configured SMTP/console
  transport), and the outcome loop closes itself: point `MAIL_IMAP_*` at the
  desk's mailbox and the server polls it, stamping pending email outreach as
  `replied` the moment the talent writes back (manual "Check replies" too).
  Only envelopes are read — message bodies never enter the application
  (ADR-0015).
- **The outcome loop** — every generated outreach message and pitch is logged
  (kind, provider, channel — never the text) and can be stamped with its fate:
  replied, no reply, converted (ADR-0014). The outreach modal shows the
  talent's history with one-click stamping plus the desk's honest reply rate;
  Reports gains an "Outcome loop" card with rates by kind and by provider
  (template vs AI). Rates count only resolved artifacts — pending never
  distorts them.
- **The Assistant** — an agent that prepares the desk (ADR-0013): it
  shortlists pool candidates for active mandates (with score + matched
  skills as the rationale), flags pipeline cards that sat untouched for a
  week, and flags talents too empty to match. It runs on the server on a
  configurable schedule — also while everyone is signed out — and stages
  everything in a review queue (Accept/Dismiss; dismissed is never
  re-proposed). Autonomy is a setting: "Suggest" stages only, "Act" applies
  internal reversible actions itself (visibly auto-applied). It never
  contacts anyone, never deletes, and spends no AI tokens in v1.
- **A browsable API reference** — the OpenAPI 3.1 contract in
  `server/openapi.yaml` now covers the full REST surface (auth, recruiting,
  documents/AI, settings, team, DSGVO — previously only the applicant-side
  endpoints) and is served at `/api/v1/openapi.yaml`, with a self-hosted
  Swagger UI at `/api/v1/docs` (no CDN, strict CSP — ADR-0012).
- **Costs are visible where AI is used** — every AI response carries its
  per-call usage (input/output tokens + estimated USD), and the provider badge
  shows it right at the result ("AI · gemini · 1.4k tok · $0.0011"): ATS,
  pitch, outreach, the editor's suggestion banner, CV import, translation,
  interview kit and candidate prep. The Settings usage card gains a
  per-provider breakdown (tokens in/out + cost per Claude/Gemini).
- **Drag-and-drop pipeline board** — candidacy cards can be dragged between stage
  columns (with drop highlighting); the per-card stage select stays as fallback.
- **Mandate from a posting** — every Matching result offers "Create mandate",
  opening the mandate form pre-filled with client, role, location and the ad
  text, so matching/ATS/prep work from day one.
- **CSV export in Reports** — booked placements download as a quoted, Excel-safe
  `placements.csv`.
- **Resume photo** — upload a portrait in the editor (downscaled client-side,
  stored as a size-capped data URI on the contact block); shown in the live
  preview and rendered into the exported PDF.
- **A4 page-break markers** — the live preview overlays dashed lines where the
  exported PDF will roughly break pages, ending page-2 surprises.
- **Email verification (soft)** — registration sends a confirmation link
  (console mailer in dev, SMTP in prod); clicking it stamps `verifiedAt`, shown
  in Settings with a resend button. Nothing is locked while unverified —
  offline-first — and verification tokens live in a store separate from
  password-reset tokens by design.

## [1.0.0] - 2026-07-02

The first stable release: the full recruiting workspace (mandates, talent pool,
pipeline, placements, reports), the document editor with PDF/dossier export and
AI assistance, team accounts with roles, DSGVO tooling — self-hosted fonts, no
sample-data pretence, and every AI feature with an honest offline fallback.

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

### Changed

- **Inbox hidden** — the placeholder Inbox view is out of the navigation until it is wired
  to a real mail source.
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

<!-- Add a new entry when cutting a release:

## [x.y.z] - YYYY-MM-DD

### Added
### Changed
### Fixed
### Removed
-->
