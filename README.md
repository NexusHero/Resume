<div align="center">

# myJob — Recruiting Suite

**Run your desk on myJob.** Mandates, talent pool and placements in one calm
workspace — from first sighting to booked fee. Plus an interactive CV, a cover-letter
and Bewerbungsmappe builder, and a small REST API behind it all.

[![CI](https://github.com/NexusHero/Resume/actions/workflows/ci.yml/badge.svg)](https://github.com/NexusHero/Resume/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%E2%89%A524-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-300%2B%20·%2090%25%20coverage-success)
![Built with AI](https://img.shields.io/badge/built%20with-Claude%20Code-d97706)

</div>

---

![myJob — Workspace overview](docs/images/myjob-overview.png)

## What is this?

A recruiting product (**myJob**) plus the personal job-application toolkit it grew out of:

- **myJob Workspace** — an ATS for recruiters/agencies: **mandates** per client (fee &
  deadline), a **talent pool**, **placements**, a dashboard and reports. Multi-user (each
  recruiter owns their own data), authenticated, with GDPR export/erasure built in.
- **Documents** — an interactive **CV** (EN/DE, accent themes, PDF export), a **cover
  letter**, and a **Bewerbungsmappe** builder.
- **REST API** — a TypeScript, hexagonal Node/Express backend (Zod, problem+json),
  file-backed by default or Postgres via `STORE=sql`.

<table>
  <tr>
    <td width="50%"><img src="docs/images/myjob-mandates.png" alt="Mandates" /></td>
    <td width="50%"><img src="docs/images/myjob-talent-pool.png" alt="Talent pool" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/images/myjob-placements.png" alt="Placements" /></td>
    <td width="50%"><img src="docs/images/myjob-reports.png" alt="Reports" /></td>
  </tr>
</table>

<div align="center"><img src="docs/images/myjob-login.png" alt="Branded login" width="92%" /></div>

## Quick start

```bash
npm install            # dependencies (server, build tools, Playwright)
npm run build:web      # bundle the recruiting app (Vite)
npm run serve          # serve the whole suite at http://localhost:4178
```

Then open the launcher at **`http://localhost:4178/`** and pick **myJob Workspace**, or go
straight to `…/design/myjob/ui_kits/recruiting/dist/index.html`. Create an account on the
login screen — the recruiting endpoints are owner-scoped, so your data is yours.

### With Docker (app + Postgres)

```bash
docker compose up --build      # app on Postgres at http://localhost:4178
```

See **[docs/deployment.md](docs/deployment.md)** for configuration (`STORE`, `DATABASE_URL`,
`CORS_ORIGINS`, `COOKIE_SECURE`, `SESSION_TTL_DAYS`, LLM keys, …).

## Feature highlights

- **Recruiting core** — create/edit mandates, talents and placements through real forms;
  dashboard KPIs and fee-per-client reports computed from your live data.
- **Auth & multi-tenancy** — email/password accounts, opaque httpOnly sessions with
  server-side expiry + `Secure` cookies, owner-scoped data per recruiter.
- **GDPR/DSGVO** — one-click **data export** (JSON download) and **account erasure** that
  wipes your records and sessions.
- **AI cover letters** — `POST /api/v1/cover-letter` writes a tailored Anschreiben via
  Claude or Gemini, switchable at runtime; deterministic template fallback when no key.
- **Job search & ATS** — skill-matched two-tier search across job boards and a JobScan-style
  gap analysis (`/api/v1/jobs`, `/api/v1/ats`).
- **Hardened & honest** — CORS allow-list, baseline security headers, rate-limited
  credentials, and **no fabricated data**: views show real records, a loading or an error
  state — never silent sample data.

## Develop with AI 🤖

This repo is built **with** AI and set up to keep going that way — contributions via
[**Claude Code**](https://claude.com/claude-code) are very welcome.

The codebase is intentionally AI-friendly: small hexagonal modules, behaviour-named tests
(`Subject_StateUnderTest_ExpectedBehaviour`), strict types, and CI gates that give an agent
fast, honest feedback. Drive it with the built-in **skills / slash-commands**:

| Skill              | Use it to…                                     |
| ------------------ | ---------------------------------------------- |
| `/analyze`         | static analysis + type-check before you commit |
| `/test`            | run the full Jest + Playwright suite           |
| `/review`          | review a PR (or your working diff) for bugs    |
| `/security-review` | security pass over the pending changes         |
| `/push`            | commit & push the current change               |

A good first loop: describe the change, let the agent implement it, then run `/analyze`
and `/test` until green and `/review` for a second pair of eyes. Every PR runs the same
gates in CI (verify · e2e · integration · CodeQL · security), so green locally means green
on GitHub.

> New here? Open an issue describing what you want to build and tag it `good-first-task` —
> the structure above makes it a clean target for an AI pair-programmer.

## Tech stack

| Layer       | Choice                                                               |
| ----------- | -------------------------------------------------------------------- |
| Backend     | Node ≥ 24, TypeScript (strict), Express, Zod, awilix DI (hexagonal)  |
| Persistence | File-backed JSON (default) or Postgres via Drizzle (`STORE=sql`)     |
| Frontend    | React, bundled with **Vite** (recruiting kit), shared design tokens  |
| Tests       | Jest + supertest (unit/acceptance), Playwright (e2e), Postgres in CI |
| Tooling     | ESLint, Prettier, Docker, GitHub Actions                             |

## Project layout

```
index.html                 ← launcher / home (generated)
server/                    ← REST API + static server (TypeScript, hexagonal)
design/
  documents/ui_kits/       ← interactive CV · cover letter · Bewerbungsmappe builder
  myjob/ui_kits/
    recruiting/            ← myJob Workspace (Vite-built → dist/)
vite.config.ts             ← bundles the recruiting kit (no CDN, no runtime Babel)
docs/                      ← architecture, deployment, roadmap, screenshots
.github/workflows/ci.yml   ← verify · e2e · integration (Postgres) · commitlint
```

## REST API (selected)

Base path `/api/v1`. Recruiting endpoints require a session; the applicant tools are open.

| Endpoint                                  | What it does                                |
| ----------------------------------------- | ------------------------------------------- |
| `POST /auth/register` · `/auth/login`     | create / sign in to an account              |
| `GET·POST·PATCH·DELETE /mandates`         | client search mandates (owner-scoped)       |
| `GET·POST·PATCH·DELETE /talents`          | the talent pool                             |
| `GET·POST·PATCH·DELETE /placements`       | booked placements + fees                    |
| `GET /account/export` · `DELETE /account` | GDPR data export / account erasure          |
| `GET /jobs` · `POST /ats`                 | skill-matched job search · ATS gap analysis |
| `POST /cover-letter` · `…/settings/llm`   | AI Anschreiben · switch Claude/Gemini       |

## npm scripts

| Script                                  | What it does                                                   |
| --------------------------------------- | -------------------------------------------------------------- |
| `npm run serve`                         | REST API + static server on `http://localhost:4178`            |
| `npm run build:web`                     | bundle the recruiting kit with Vite (→ `…/recruiting/dist`)    |
| `npm test`                              | Jest unit + acceptance with coverage gate                      |
| `npm run test:e2e`                      | Playwright UI acceptance (boots the server, builds the bundle) |
| `npm run pdf`                           | render the CV / cover-letter PDFs and refresh the launcher     |
| `npm run lint` · `npm run format:check` | ESLint · Prettier                                              |

## License

See [LICENSE](LICENSE). The CV content and portrait are personal to Suhay Sevinc; the code
and design system are free to learn from and build on.
