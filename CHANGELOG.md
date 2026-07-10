# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### Added

- **Accessibility: keyboard, focus and screen-reader support** (#203). The whole
  app is now operable without a mouse and legible to assistive tech. A visible
  **`:focus-visible` accent ring** marks the focused control everywhere; a
  **Skip to content** link (first tab stop) jumps past the rail; the primary
  navigation is a labelled `<nav>` and the canvas a single focusable `<main>`.
  **Every dialog is a real modal** — `role="dialog"`, `aria-modal`, a labelled
  title, a **focus trap**, **Esc to close**, and focus **returned** to the opener
  on close (record form, dossier, and the DSGVO confirm). **Pipeline cards are
  keyboard-operable** — Tab-reachable, Enter/Space to open, with a per-card
  `aria-label` — and every stage `<select>` and icon-only button carries an
  accessible name. An **automated axe-core guard** (`__tests__/a11y-axe.test.jsx`)
  runs in the normal test suite and fails the build on any serious/critical
  violation across Login, the Applications board, Matching, the confirm dialog
  and the undo snackbar.
- **Light mode** (ADR-0053). The app was dark-only; it now offers a **Light /
  Dark / System** appearance choice in Settings and a one-click toggle in the
  rail footer. The default follows your OS (`prefers-color-scheme`); an explicit
  choice persists across reloads. It's a pure token layer — `data-mode` on
  `<html>` selects the light (`:root`) or dark (`[data-mode="dark"]`) token set,
  so every view inherits both themes with no component changes. The **ink
  navigation rail and auth brand panel stay dark in both themes** (the brand
  anchor, like Slack/Linear); only the working canvas changes. The document
  editor's preview and exported PDF stay white in both (no theme bleed). WCAG AA
  contrast is enforced in **both** themes by the #198 guard (which flagged the
  dark soft-text token, now lightened).
- **The Applications board is now interactive.** A card can be moved through the
  pipeline (SUBMITTED → IN REVIEW → INTERVIEW → OFFER → HIRED) by drag-and-drop or
  its per-card stage dropdown — both persist via `PATCH /api/v1/applications/:id`
  — and a mis-filed application can be removed (new
  `DELETE /api/v1/applications/:id`, 204). Previously the board was display-only
  and applications could not be deleted at all.
- **A first-run onboarding card** on the Workspace: an empty desk now offers
  three clear first actions (add a talent, create a mandate, find roles) instead
  of four zeroes and empty panels.

### Fixed

- **Derived display names no longer leak the email's plus-address or digits**:
  `recruiter+test123@…` now greets you as “Recruiter”, not “Recruiter+”.
- **Removed a German string leak** in the English UI: the job-posting card's
  action reads “Job description” instead of “Stellenbeschreibung”.
- **Views refresh on navigation** so a teammate's change on the shared team desk
  shows up without a full page reload — the pool, mandates and applications
  refetch in the background (no spinner flash) when you open them.
- **The ATS check no longer overlooks skills listed only under a role**: the
  analysis now feeds every skill the CV states — the top-level skill groups and
  the per-experience tags — so a keyword present under a job entry isn't wrongly
  reported as missing.
- **Recruiter-appropriate Talent Pool framing**: the subtitle now reads “The
  candidates you represent” instead of the job-seeker-flavoured “…me first”.
- **WCAG AA contrast, now guarded**: the softest text token (`--text-soft`) was
  a hair too light on the sunk grey surface (4.34:1 — below the 4.5:1 floor for
  small text); it's nudged one shade darker (visually unchanged) so every
  text-on-surface pairing clears AA on white **and** grey. A new token-contract
  guard (`tokens/contrast-audit.mjs` + `contrast-pairs.mjs`, enforced by
  `contrast.test.js` in `./test.sh`) resolves each used token pair to a colour
  and fails the build if any drops below its WCAG floor — so it can't regress,
  and a second theme (dark mode) plugs in as one fixture. Documented in the
  design-system readme.
- **De-overloaded the accent colour on job cards** (semantic colour roles): a
  card now carries at most **one** solid-accent element — the primary CTA (“View
  posting”). The match badge reads as an assessment (success green ≥ 80%, neutral
  below), met-skill chips are success-soft “good news”, and the salary/meta pills
  are neutral — so the one-accent hierarchy that defines the rest of the product
  holds in Matching too. Also drops two German leaks on the card (“Created
  manually”, “Apply candidate”) and the stray accent salary pill on the Workspace
  job card.

- **The CV/cover-letter editor is now truly WYSIWYG** (ADR-0052): the live
  preview and the exported PDF are rendered from a single source
  (`documentsToHtml`). The preview is an `<iframe>` of the exact HTML the PDF is
  built from (new `POST /api/v1/talents/:id/documents/preview`), so they can no
  longer drift — same columns, margins and line breaks — and the Style controls
  (template/accent/font/size) now drive the export too. Section headings are
  English (`Profile`/`Experience`/`Education`/`Skills`) to match the product; the
  PDF bytes are otherwise unchanged (print still driven by `@page`).

- **A new “Ink” CV template** — a portfolio-grade, two-column résumé: a dark
  sidebar (rounded photo, name, role pill, icon contact rows and skill chips)
  beside a light main column with eyebrow-labelled sections, an experience
  timeline (node dots, date pills, tech-stack chips) and accent bullets, plus a
  clean matching cover letter. Selectable from the editor's Style bar alongside
  Classic/Modern/Compact and rendered from the same single source
  (`documentsToHtml`), so the live preview and the exported PDF stay
  byte-identical. Its display/body/mono webfonts (Space Grotesk, Inter, JetBrains
  Mono) are embedded so the typography is exact in both the iframe preview and
  the PDF with no network request or host-font dependency, and a print-only fixed
  spine keeps the dark band full-height on every page while the cover letter
  stays clean.

### Changed

- **Clearer navigation taxonomy.** Matching moved from **People** into the
  **Work** funnel (Workspace → Mandates → Matching → Applications → Placements) —
  it's an action on the work, not a way to browse people — leaving **People** as
  just the Talent Pool you represent. The **AI** section is renamed **Assistant**
  (a place, not a category; the product name _CoRecruiter_ stays on the item).
  Routing ids are unchanged, so state and deep-links are unaffected — only the
  labels/grouping. Rationale in `design/myjob/decisions/nav-taxonomy.md`.
- **Undo over Confirm for destructive actions.** Removing an application, a
  placement or a candidate from a pipeline no longer pops the browser's
  `window.confirm` (which breaks the designed world). The row disappears
  immediately and a bottom snackbar offers **Undo** for ~6s; the real `DELETE`
  is sent only after it times out (or is flushed on navigation/unload), so the
  ids and audit history are preserved. Candidate-remove previously had **no**
  guard at all — now it's undoable too. Truly irreversible actions (DSGVO
  anonymisation) keep a deliberate confirm, but a designed in-app dialog rather
  than the system prompt. No `window.confirm` remains in the recruiting kit.
- **One kanban interaction model for both boards.** The Applications board and
  the Mandate pipeline looked alike but behaved differently — one moved cards by
  a stage dropdown + trash, the other by drag + an `x` in a different spot. They
  now share a single column + card implementation (`KanbanShared.jsx`), so drag
  feedback, the Stage `<select>`, the remove button (same trash icon and
  placement) and click-to-open are **identical** on both; only the card's body
  (company + match score vs. talent + note) differs. A user who works both no
  longer learns two dialects. The duplicated drag/drop and column code is gone.
- **NestJS is now the composition root and HTTP layer** (ADR-0051, supersedes
  ADR-0002): all 27 controllers/101 routes moved to Nest feature modules with
  guards (`AuthGuard`, `RolesGuard` RBAC, `PlanGuard` Pro gate, per-user AI and
  per-IP auth rate limits), the shared `ZodValidationPipe` and the RFC-9457
  `ProblemJsonFilter`. Awilix, `container.ts` and the hand-built
  `http/create-app.ts` are retired; the hexagonal core (domain, ports, adapters,
  zod, Drizzle) is unchanged and services stay decorator-free behind injection
  tokens. The API contract is byte-compatible (verified by the 199-test contract
  suite now running against the Nest app, plus per-vertical Nest suites); dev
  `npm run serve` boots via SWC (decorator metadata), production stays `tsc` +
  `node dist`.

### Added

- **All job boards on by default, one search across all of them** (ADR-0050,
  FR-53): a plain install now fans a single search out across every configured
  board at once instead of a single default. New boards are added
  **declaratively** — a `JobSourceDescriptor` interpreted by a generic
  `RestJobSource`, with no bespoke adapter — either built-in (keyless
  **Remotive**, **Jobicy**, **Remote OK** join Arbeitnow/Bundesagentur/Adzuna) or
  via a `JOB_SOURCES_FILE` JSON list. `JOB_SOURCES_DISABLED` turns a single board
  off; `JOB_SOURCES` still works as a legacy allow-list.
- **Accumulated job counts per source**: Matching shows the total postings across
  all API sources ("N jobs across M/K sources") with a per-board count breakdown;
  an unreachable board is shown struck-through rather than silently missing.
- **Animated boot splash**: a branded myJob equalizer (animated bars + wordmark +
  shimmer) paints instantly from `index.html` — before React mounts — and fades
  out once the session resolves, with a short minimum on-screen time and a
  `prefers-reduced-motion` fallback. Covers web, the installed PWA, and the
  native webview's first paint.

### Security

- **Generative AI routes are rate-limited per user** (ADR-0049, NFR-11): the
  token-spending routes (`documents/ai|parse|ats|pitch|outreach|translate`,
  match AI, `compliance/agg-rewrite`, `cover-letter`, CV import) now enforce a
  per-user limit (`AI_RATE_LIMIT_PER_MINUTE`, default 30; `0` disables), returning
  `429 problem+json` — one caller can no longer exhaust the owner's LLM budget.
- **Applications are now team-scoped** (ADR-0048, FR-15): previously every
  authenticated user could read **every team's** applications via
  `GET /api/v1/applications` and `/history`. `Application` gains an `ownerId`,
  every repository read is owner-filtered (fs + Postgres, additive `owner_id`
  migration backfilled to the default team), and the audit history is scoped to
  the caller's own applications.

### Added

- **Apply a candidate without a job board** (ADR-0048, FR-16): Matching's Manual
  mode gains an "Apply {candidate} to a role" panel — type a company + role, or
  prefill from one of your mandates, then apply. The core workflow no longer
  depends on a reachable external job board.
- **Applications are included in the DSGVO account export** (ADR-0048) so the
  owner-scoped export is complete.
- **The Applications page is a working submission pipeline** (ADR-0046, FR-15/16):
  the board now reads the live applications resource instead of a hard-coded empty
  list, and **Matching gained a "+ Apply {candidate}" action** that files an
  application for the selected candidate, capturing the posting's company and role.
  `Application` records carry optional talent linkage (`talentId`/`talentName`),
  persisted by both the file and SQL stores.
- **Placements can be deleted from the UI** (ADR-0047, FR-17): the edit form has a
  confirming Delete action wired to the existing `DELETE /placements/:id`.

### Changed

- **Job search shows real board data only** (ADR-0045, FR-52): the fabricated
  `SampleJobSource` is removed. The keyless **Arbeitnow** board is enabled by
  default (`JOB_SOURCES` unset), so a fresh install queries live postings; when
  every source is down the search returns empty and the UI says the live sources
  are unreachable rather than showing mock postings.
- **Placement `fee` is validated as a monetary amount** (ADR-0047, FR-17), server-
  side (`moneyString`) and in the create/edit form — free text like "lots" is
  rejected instead of stored.
- **Job-board requests are resilient** (ADR-0049, NFR-12): each board request has
  a timeout (`JOB_SOURCE_TIMEOUT_MS`, 8 s) and a bounded retry (`JOB_SOURCE_RETRIES`)
  so a hung or flaky board is skipped rather than hanging or emptying the search.
- **The recruiter dashboard is framed as an agency view**: "your own applications
  (me)" becomes "Applications to progress" (desk-wide interview/offer stage), and
  count badges hide at zero.

### Fixed

- **PDF export works in the production container** (ADR-0049, FR-21): the runtime
  image now installs Chromium + fonts and points Puppeteer at it
  (`PUPPETEER_EXECUTABLE_PATH`), so CV/dossier/Mappe rendering no longer fails on
  a browserless slim image.
- **The "AI tailor" (KI anpassen) button no longer fails silently** (ADR-0047,
  FR-44): failures (Pro gate, missing key, network) now show a visible error with
  a retry instead of an empty `catch`.
- **Talent document PDFs download reliably** (ADR-0047, FR-24): the bytes are
  fetched and saved as a file rather than opened with `window.open()`, which was
  silently blocked under the strict CSP, the installed PWA and the native shell.

### Added (docs)

- **A read-only Swagger UI mirror on GitHub Pages** (ADR-0044): the same
  self-hosted OpenAPI reference as `/api/v1/docs`, published as a static site
  on every push that touches `server/openapi.yaml` — no server required to
  browse the contract. "Try it out" is disabled on this mirror; the
  interactive version that can execute real requests stays at `/api/v1/docs`.

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
  installable iOS/Android app. The Android platform project now builds
  on demand in CI (**Native — Android** workflow) into an installable,
  unsigned debug APK artifact; iOS and any signed release build remain a
  manual, documented walkthrough — `docs/native-app.md`.
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
