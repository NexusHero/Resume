# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

## [2.0.0] - 2026-07-04

A major version: the highest-consequence hand-rolled component — authentication
— is now delegated to an audited framework, and the suite grew from a
single-tenant app into a production-ready, installable, multi-tenant platform.
See **Breaking** below before upgrading a live deployment.

### Breaking

- **Authentication now runs on Better-Auth (embedded SQLite), not hand-rolled
  scrypt + session store** (ADR-0043). Credentials and sessions are owned by
  the engine; the domain `User` keeps no password hash. This is a **clean
  break, not a migration**: an account created before this release cannot log
  in with its old password and must go through **password reset** once to get
  an engine credential. The legacy `SessionStore` (fs/sql/memory adapters +
  port), `PasswordHasher`/`ScryptPasswordHasher`, and the SQL `sessions` table
  are removed entirely — there is no fallback path. If you operate a live
  deployment with real users, tell them to reset their password _before_ you
  roll this out, or they will be locked out at their next login attempt.
- **The server now runs as ESM, not CommonJS** (ADR-0042 — `"type": "module"`,
  `nodenext` module resolution). Only relevant if you import `server/src`
  directly from another CommonJS package; the HTTP API and CLI entry points
  are unaffected.

### Added

- **Multi-tenancy, end to end** (ADR-0033–0038): every account belongs to a
  tenant (default `'team'` preserves single-tenant behaviour); admins manage
  their tenant's roster and roles; **tenant onboarding by invitation** (an
  admin invites an email with roles, the invitee sets a password and lands
  already in that tenant); an opt-in **`SELF_SERVE_TENANTS`** mode lets each
  registration spin up its own isolated workspace; a **config-only,
  non-escalatable super-admin** (`SUPER_ADMIN_EMAIL`) can read the cross-tenant
  registry and **suspend** a tenant — suspension is enforced in the auth path
  itself, killing live sessions immediately, not just blocking new logins.
- **Production readiness, the D-series** (ADR-0029–0032): a **fail-fast
  readiness gate** refuses to boot in production without Postgres and a real
  `APP_SECRET`; **scheduler leader election** via Postgres advisory locks so
  only one instance runs the background jobs in a scaled deployment; PDF
  archival to **S3-compatible object storage** behind the existing port; a
  **bounded render pool** caps concurrent Puppeteer/Chromium instances so PDF
  export can't exhaust memory under load. A companion **deployment blueprint**
  documents the reference topology and go-live checklist.
- **Installable PWA** (ADR-0028, then rebuilt on **Workbox** via
  `vite-plugin-pwa` in ADR-0041): a manifest, generated icons, and a service
  worker with a richer offline experience — an offline banner and
  stale-while-revalidate caching (ADR-0039).
- **Capacitor native app wrapper** (ADR-0040): the same web build wraps into an
  installable iOS/Android app (web-side wiring; the native build/signing step
  is a manual, documented walkthrough — `docs/native-app.md`).
- **Fully responsive UI** (ADR-0025–0027): a `matchMedia` viewport hook, a
  mobile navigation drawer, responsive dashboard grids and scrollable tables,
  and a responsive CV profile/editor/modals — the whole recruiting kit down to
  a phone.
- **Autopilot — the auto-apply gear** — the assistant gains a third autonomy
  level beside Suggest and Act (ADR-0019): on **Autopilot** it builds the whole
  application for a strong match — a CV tailored to the ad, a cover letter in
  the ad's language, and a Bewerbungsmappe with the candidate's certificates —
  and stages it for one-click approval (with a "Download Mappe" preview and a
  grounding warning for unsupported claims). A single **source** switch aims it
  at the job postings received from the boards or at your own mandates; a
  job-board opening is turned into a mandate only on approval, so one pipeline
  serves both. The candidate's stored documents are never overwritten (the
  tailored packet is a snapshot), nothing is ever sent out on its own, and
  per-run caps keep the token spend predictable.
- **Compliance automation** — three tools that were one step short are now
  actionable end to end (ADR-0018): a **KI-Audit-Trail** exports the per-call
  AI processing record (model, feature, tokens, cost, timestamp) as JSON or a
  CSV from the usage card; **Löschfristen-Automatik** adds a hard deletion
  deadline beside the review window — overdue candidates can be cleared one by
  one, in bulk, or by an opt-in background sweep (anonymize-only, admin-only,
  off by default); and the **AGG-Schreibhilfe** turns a flagged job ad into a
  neutral draft in one click, replacing the phrases it safely can and
  surfacing the ones that need a human decision.
- **Matching v2 — hybrid ranking with local embeddings** — the pool ranking
  now blends the skill/ontology score (70%) with text similarity between the
  job ad and the candidate's full profile (30%), computed by local hashed
  lexical embeddings behind a swappable `EmbeddingProvider` port (ADR-0017).
  Catches candidates whose fit lives in their CV bullets rather than their
  skill list — fully offline, deterministic, no candidate data leaves the
  server. Match results show the breakdown (skills vs. text) so the blend is
  never a black box. **Pluggable neural embeddings** followed — optional
  Ollama or OpenAI embedding providers behind the same port, alongside the
  offline hashed-embedding default.
- **Forecast v2 — the prediction flywheel** — every pipeline stage move is now
  logged, and the revenue forecast learns its stage probabilities from the
  desk's own resolved candidacies instead of one-size-fits-all industry
  constants (ADR-0016). Provenance is always declared: each stage shows
  whether its number is "yours" (with the sample size) or still the default —
  below 5 resolved journeys per stage nothing changes. The same log yields
  interview intelligence: per-client interview→placement conversion on the
  forecast card (min. 3 resolved interviews).
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
- **The Assistant (CoRecruiter)** — an agent that prepares the desk (ADR-0013):
  it shortlists pool candidates for active mandates (with score + matched
  skills as the rationale), flags pipeline cards that sat untouched for a
  week, and flags talents too empty to match. It runs on the server on a
  configurable schedule — also while everyone is signed out — and stages
  everything in a review queue (Accept/Dismiss; dismissed is never
  re-proposed). Autonomy is a setting: "Suggest" stages only, "Act" applies
  internal reversible actions itself (visibly auto-applied). It never
  contacts anyone, never deletes, and spends no AI tokens in v1.
- **Bulk CV import** — upload multiple PDFs at once into the talent pool.
- **Pro/Free plan gate** — a single HTTP seam (`requirePlan`) ready to gate
  features by plan; no license/billing integration yet (deferred on purpose).
- **A browsable API reference** — the OpenAPI 3.1 contract in
  `server/openapi.yaml` now covers the full REST surface (auth, recruiting,
  documents/AI, settings, team, DSGVO — previously only the applicant-side
  endpoints) and is served at `/api/v1/openapi.yaml`, with a self-hosted
  Swagger UI at `/api/v1/docs` (no CDN, strict CSP — ADR-0012), plus a
  docs-freshness guard and a drift test so the spec can't quietly go stale.
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
- **An EU AI Act compliance one-pager** — risk classification and the
  transparency/oversight controls the suite already implements, on one page.
- A Vitest/jsdom unit + component test base for the recruiting kit (ADR-0023),
  used throughout this release's frontend work.

### Changed

- **The auth stack was hardened in two stages this release**: first the
  Better-Auth engine landed dormant alongside the existing scrypt/session path
  (ADR-0042/0043 groundwork, incl. the ESM migration Better-Auth required),
  then it went live behind `AuthService` (see **Breaking**), and finally the
  legacy stack it replaced was deleted outright.
- **`architecture.md` is now the single documentation entry point** — a
  documentation map at the top links every companion doc (security, ADRs,
  deployment, requirements, roadmap), with an "Architecture at a glance — and
  why" section explaining the forces behind each major choice. arc42 was also
  brought current earlier in the cycle: both UML diagrams (system context,
  building blocks) redrawn for the recruiting suite, and the stale sections
  refreshed (per-user provider choice + call-usage, API contract, cost
  transparency, ADR 0011/0012, release pipeline).
- The German-named recruiting-kit source files were renamed to English, with
  every import updated to match.
- The decorative notification bell and the always-empty Applications board
  (and its Reports funnel card) are hidden until they have a real data source
  — same call as the Inbox.
- Internal refactors with no behaviour change, done to keep the codebase
  honest as it grew: `AssistantService.run` decomposed into single-concern
  playbook steps; `AutopilotService` split out of the assistant; the
  `DocumentAiService` LLM scaffold split into a runner + five focused
  services; the `MandatePipeline` god-component split into a board + five
  feature modals (ADR-0024); a shared `runFeature` helper and a `requireCan`
  authorization seam factored out; the DSGVO talent-data purge steps and the
  personal-data erase/export registry consolidated, each with its own
  sequence diagram.

### Fixed

- **An unauthenticated endpoint is closed** — the personal `application`
  endpoints required no session; they now require `requireAuth` like the rest
  of the authenticated surface (security audit finding #1).
- **A dead live-job-source no longer looks like "no openings"** — when live
  boards (Arbeitnow / Bundesagentur / Adzuna) are configured but every one
  fails (network blocked, API down, bad key), the search now falls back to
  the offline sample **and says so**: the API returns `liveSourcesDown: true`
  and Matching shows "Live job sources are configured but unreachable" instead
  of a silent empty list. A single failing source keeps merging as before, and
  an empty result from a healthy source still counts as honest "no hits".
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
- **A stale service worker no longer breaks the acceptance-test mocks** —
  fixed at the test-harness level (`serviceWorkers: 'block'` in the Playwright
  config), not the app: the Workbox service worker's runtime cache proxied
  `/api/v1/*` around any request mocked with `page.route`, which made
  create→reload style flows intermittently hit the real server instead.
- Offline outreach no longer renders "your profile as the role" when no role
  is known — the phrase is dropped instead.
- The letter preview no longer shows a leading comma before the date when the
  sender has no location.

### Removed

- The hand-rolled `SessionStore` (fs/sql/memory adapters + port),
  `PasswordHasher`/`ScryptPasswordHasher`, `UserRepository.updatePassword`,
  and the SQL `sessions` table — superseded by the Better-Auth engine (see
  **Breaking**).

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
