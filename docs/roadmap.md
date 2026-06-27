# Roadmap

Where the project goes from a high-quality personal tool to a product with market
potential. Phases are ordered so each builds on the previous and ships as its own
PR (PR-only workflow, `main` is protected). Effort: **S** ≤ 0.5 d · **M** ≈ 1–2 d ·
**L** > 2 d.

Status legend: ✅ done · 🚧 in progress · ⬜ planned.

---

## Phase 0 — Technical debt & operational readiness

Small, low-risk PRs. No architectural change.

| #   | Measure                                                                  | Files                                    | Effort | Status                                |
| --- | ------------------------------------------------------------------------ | ---------------------------------------- | ------ | ------------------------------------- |
| 0.1 | zod 3 → 4                                                                | `package.json`, `domain/*`               | S      | ⬜                                    |
| 0.2 | Express 4 → 5 (drop the `asyncHandler` workaround once errors propagate) | `package.json`, `http/*`                 | M      | ⬜                                    |
| 0.3 | Align `@types/node` with `engines` (Node 24)                             | `package.json`                           | S      | ✅                                    |
| 0.4 | Enable Dependabot (npm + GitHub Actions)                                 | `.github/dependabot.yml`                 | S      | ✅                                    |
| 0.5 | Generate OpenAPI from zod + serve it at `/api/v1/docs`; drift test       | `http/openapi.ts`, `server/openapi.yaml` | M      | ⬜ (spec now hand-kept incl. `/jobs`) |
| 0.6 | Wire Stryker mutation testing into CI with a score gate                  | `ci.yml`, `stryker.config.js`            | S      | ⬜                                    |
| 0.7 | ts-jest → Vitest (removes the CommonJS-only tsconfig)                    | `jest.config.js`, `package.json`         | M      | ⬜                                    |
| 0.8 | Converge `tools/*.js` onto the `server/` core (one PDF render path)      | `tools/`                                 | M–L    | ⬜                                    |

## Phase 1 — Real persistence

Cheapest big step — the ports already exist.

- **1.1** SQL adapter (Drizzle) for `ApplicationRepository`, `AuditLog`. **L**
  - ✅ Postgres adapters (Drizzle + `pg`) for applications, audit log and saved
    searches; `schema.ts` + idempotent `migrate()` run on boot; pure row↔domain
    mappers unit-tested; `createPersistence` factory switches on `STORE=fs|sql`
    (default `fs` → app/CI/offline unchanged). Thin DB glue is exercised by a
    `DATABASE_URL`-gated integration test (skipped without a DB, so the gate stays
    Docker-free); verified end-to-end against real Postgres 16.
  - Outstanding: object-storage adapter (S3/MinIO) for `PdfArchive` (still fs).
- **1.2** ✅ Make the git `Versioner` optional — a `NoopVersioner` is used when
  `STORE=sql` (no JSON files to commit; committing would also needlessly fire git
  hooks). The git versioner now only runs for the file store.

## Phase 2 — Multi-tenancy & auth (turns the tool into a product)

- **2.1** User/tenant model; every application carries `tenantId`; data-isolation tests. **L**
- **2.2** Auth layer (OIDC or slim JWT+session); `http/auth-middleware.ts` + `AuthContext`;
  401 stays problem+json. **L**
- **2.3** Decouple the hardcoded "Suhay Sevinc" data (PDF title, CV templates) → per-profile. **M**
- **2.4** Rate-limiting + CORS hardening (today `Access-Control-Allow-Origin: *`). **S**

## Phase 3 — AI differentiator (the sellable feature)

New ports in the hexagonal core. Uses the Claude API.

- **3.1** `JobSource` port + adapter per board (Bundesagentur/Adzuna/Arbeitnow public;
  StepStone/Indeed/LinkedIn/XING via key/OAuth). Sample offline adapter exists. **L**
  - ✅ port + `SampleJobSource` shipped in 3.5.
  - ✅ live adapters: **Arbeitnow** (open), **Bundesagentur** (public key),
    **Adzuna** (app id+key). Resilient `CompositeJobSource` (one failing source is
    skipped) + `createJobSource` factory; enabled via `JOB_SOURCES` env, offline
    sample as default. Mappers unit-tested against recorded shapes; verified live.
  - Outstanding: OAuth boards (StepStone/Indeed/LinkedIn/XING). Note: postings
    without skill tags score neutral (100) until skill extraction lands in 3.2.
- **3.2** `Matcher` port — job↔candidate score feeding the existing `match %` UI. **M**
  - ✅ skill scoring (`domain/skill.ts`) + `JobSearchService` shipped in 3.5.
  - ✅ skill **extraction**: `SkillExtractor` port + rule-based `KeywordSkillExtractor`
    (taxonomy + word-boundary matching for `C++`/`C#`/`Go`/`Java`…). The service
    enriches a posting's tags with skills found in its title/description, so
    tagless boards (Bundesagentur) become matchable. Verified live.
  - Outstanding (needs AI, deferred to the very end): an **LLM-backed
    `SkillExtractor`** to resolve context the keyword matcher cannot — e.g. "jobs
    _in Rust_" (the German town) vs the Rust language; seniority/synonyms.
- **3.3** `CoverLetterWriter` port — auto-tailored cover letter per job, folded into `build`. **M**
- **3.4** ATS keyword scoring (JobScan-style) — CV↔posting gap analysis; shares
  `missingSkills` with 3.2. **M**
  - ✅ `analyzeGap` domain + `AtsService` + `POST /api/v1/ats`: paste a posting
    (role/text/skills), get a coverage score, matched + missing keywords and
    per-gap recommendations. Reuses `SkillExtractor` + `scoreJob`.
- **Saved / named searches** ✅ — `SavedSearch` domain, `SavedSearchRepository`
  port + fs adapter, `SavedSearchService`, REST CRUD + run
  (`GET/POST/DELETE /api/v1/searches`, `GET /api/v1/searches/:id/run`). Lets the
  candidate keep several named queries and re-run them through the two-tier search.

### 3.5 — Skill-based two-tier job matching ✅ (shipped)

When the job search opens, a pre-configured search runs immediately; results are
shown in two tiers — strong fits (≥ 80 % skill coverage) first, then everything
else. Lower-match jobs are **kept**, not filtered out: they are stretch / new-domain
opportunities (new technologies worth growing into).

- **3.5.1** Candidate skill set (`config.candidateProfile`, derived from the CV; weighted). ✅
- **3.5.2** `Matcher` skill score — `scoreJob()` returns `{score, matched, missing}`;
  rule-based today, LLM extraction later. ✅
- **3.5.3** Two-tier grouping in `JobSearchService` (threshold default 80, configurable). ✅
- **3.5.4** Pre-configured default search (`GET /api/v1/jobs` with no params). ✅
- **3.5.5** UI: two sections in `karriere/JobSearch.jsx` with headers, a "Nur Top-Treffer"
  toggle, and a "+N neue Skills" hint on stretch jobs — built only from existing
  design-system components/tokens. ✅
- Outstanding: saved/named searches; live board adapters behind 3.1; LLM skill extraction.

## Phase 4 — Real frontend build

- **4.1** Vite + React + TS instead of in-browser Babel-standalone; tokens as a shared
  package; kits become typechecked components. Keep the self-contained HTML CV as an
  export artifact. **L**
- **4.2** Design system as a versioned internal package (DesignSync remains the source). **M**

## Phase 5 — Hosting & deploy

- **5.1** Docker image (multi-stage; account for Puppeteer/Chromium or externalise rendering). **M**
- **5.2** Deploy target (Fly.io/Render/Railway) + readiness probe (`/api/v1/health` exists). **S**
- **5.3** Secrets/config via env; nothing in the repo. **S**
- **5.4** Observability — structured pino logs shipped out + basic metrics. **M**

## Cross-cutting (ongoing)

- Keep arc42 current (`docs/architecture.md`, `docs/umls/*.puml`).
- Conventional Commits + CHANGELOG; PR-only.

### Fastest path to a demonstrable product

**0.5/0.6 → 1.1 → 3.3 + 3.4** — clean API docs, a real DB, and AI cover letters +
ATS scoring as the visible differentiator, without first building full multi-tenancy.
