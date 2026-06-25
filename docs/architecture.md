# Architecture — Résumé / myJob Suite

> Documented with [arc42](https://arc42.org). Modeling language: **UML** (PlantUML sources in
> [`docs/umls/`](umls), rendered to `.svg`). This document is filled out incrementally as the
> system is rebuilt; sections marked _TODO_ land with the TypeScript backend (PR2) and the docs
> pass (PR4).

## 1. Introduction and Goals

A self-contained suite for producing and tracking job applications:

- **Web UIs** — an interactive CV, a cover letter, a Bewerbungsmappe (application bundle)
  builder, and the **myJob** recruiting/applicant app. All are self-contained HTML.
- **REST API** — records sent applications, keeps an append-only audit trail, and renders
  print-quality PDFs (CV + cover letter + attachments merged into one document).

### Quality goals

| #   | Quality          | Scenario                                                                      |
| --- | ---------------- | ----------------------------------------------------------------------------- |
| 1   | Maintainability  | Layered, SOLID, ≥ 90 % test coverage on core logic.                           |
| 2   | Interoperability | A documented, versioned REST API (`/api/v1`, OpenAPI) other apps can consume. |
| 3   | Portability      | Runs locally; a tagged release produces a downloadable, runnable artifact.    |
| 4   | Correctness      | PDFs are vector-quality; the audit trail is append-only and git-versioned.    |

### Stakeholders

| Role              | Concern                                            |
| ----------------- | -------------------------------------------------- |
| Applicant (owner) | Create/track applications, export PDFs.            |
| External apps     | Integrate against a stable, documented API.        |
| Contributors      | Clear architecture, tests, and contribution rules. |

## 2. Constraints

- Web UIs must work via `file://` (offline, Safari-friendly) — assets inlined, no bundler at runtime.
- Backend: **TypeScript**, **Awilix** DI (no decorators), **pino** logging, **zod** validation.
- Tooling/CI conventions follow the sibling `LOLRecommender` repo. English end-to-end.

## 3. Context and Scope

See [`docs/umls/03_system_context.puml`](umls/03_system_context.puml).

![System context](umls/03_system_context.svg)

- **Owner / external apps** → REST API over HTTP (`/api/v1`).
- API → **Puppeteer** (headless Chromium) to render HTML to PDF.
- API → **git** to version the application log and audit trail.
- API → **filesystem** (`bewerbungen/`) for the application store and archived PDFs.

## 4. Solution Strategy

| Goal             | Approach                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Maintainability  | Controller → Service → Repository layering; dependencies injected via Awilix.               |
| Interoperability | Versioned routes + OpenAPI 3 spec + zod-validated DTOs + problem+json errors.               |
| Testability      | Side effects (fs, git, Puppeteer) behind interfaces; unit + integration + acceptance tests. |
| Portability      | `npm run package` / tagged release builds a runnable artifact.                              |

## 5. Building Block View

The backend lives in `core/` and is strictly layered (dependencies point inward only):

![Building blocks](umls/05_building_blocks.svg)

| Layer       | Building block                                                                                                               | Responsibility                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| HTTP        | `create-app`, `ApplicationController`, `problem`, `async-handler`                                                            | Express routing, zod validation at the boundary, RFC 9457 problem+json errors.                                        |
| Application | `ApplicationService`                                                                                                         | The only place business rules live: record / build / update, audit, version. Depends on **ports**, never on adapters. |
| Domain      | `application` (types + zod), `errors`                                                                                        | The model and its invariants. No I/O.                                                                                 |
| Ports       | `ApplicationRepository`, `AuditLog`, `PdfArchive`, `PdfRenderer`, `PdfMerger`, `Versioner`, `Clock`, `IdGenerator`, `Logger` | Interfaces the service depends on (rendering and merging are separate ports — ISP).                                   |
| Adapters    | `Fs*`, `GitVersioner`, `PuppeteerPdfRenderer`, `PdfLibMerger`, `SystemClock`, `RandomIdGenerator`, `pino`                    | Concrete I/O implementations, wired in `container.ts` (Awilix).                                                       |

The composition root (`container.ts`) is the single place that knows which adapter
implements each port — so tests substitute in-memory fakes and never touch git or Chromium.

## 6. Runtime View

`POST /api/v1/applications/build`:

1. `ApplicationController.build` validates the body with `buildApplicationSchema` (zod).
2. `ApplicationService.build` calls `PdfRenderer` to render the cover letter + CV and merge
   them with the attachments.
3. The merged PDF is written via `PdfArchive`; the record is added through `ApplicationRepository`.
4. A `create` event is appended to the `AuditLog`; `Versioner.commit` versions the change.
5. The controller responds `201` with `{ application, pdfBase64 }`.

`PATCH /api/v1/applications/:id` loads the record, applies the changed mutable fields only,
audits and versions; an update with no effective change is a no-op (no version is written).

## 7. Deployment View

- **Local:** `npm run serve` runs the TypeScript server via `tsx`; `npm start` runs the compiled
  `core/dist`. The server serves both the REST API (`/api/v1`) and the static web UIs.
- **Release:** pushing a `v*` tag triggers `release.yml`, which builds a downloadable, runnable
  artifact per OS (compiled `core/dist` + the static app) and attaches it to a GitHub Release.
  Consumers run `npm ci --omit=dev && npm start`. A single-binary build (pkg) is a future step.

## 8. Cross-cutting Concepts

- **Logging:** structured pino logger, injected.
- **Validation & errors:** zod at the boundary; RFC-9457 `application/problem+json` responses.
- **Versioning of data:** every write is committed to git, scoped to the store files.

## 9. Architecture Decisions

| ADR | Decision                                                                           | Status   |
| --- | ---------------------------------------------------------------------------------- | -------- |
| 001 | Rewrite backend in TypeScript, layered (SOLID).                                    | Accepted |
| 002 | Awilix for DI (no decorators / reflect-metadata).                                  | Accepted |
| 003 | pino for logging.                                                                  | Accepted |
| 004 | Keep the API unauthenticated (trusted personal domain), but versioned + specified. | Accepted |

## 10. Quality Requirements

| Quality          | Scenario                                                                | Verified by                                   |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Maintainability  | `core/` business logic stays ≥ 90 % covered                             | Jest coverage gate (CI)                       |
| Test quality     | Surviving mutants stay below threshold                                  | Stryker (`npm run mutation`)                  |
| Interoperability | The API matches the OpenAPI contract and returns problem+json on errors | acceptance (supertest) tests                  |
| Usability        | The web UIs render and read in English                                  | Playwright UI acceptance (`npm run test:e2e`) |
| Consistency      | Every commit is a Conventional Commit; format/lint clean                | CI + git hooks                                |

## 11. Risks and Technical Debt

- ✅ The REST API has been rewritten into the layered `core/` (TypeScript, SOLID); the legacy
  `tools/server.js` is removed.
- The CLI scripts (`npm run sent` / `home` / `pdf`) still use the old `tools/*.js` persistence,
  duplicating `core/`'s repository against the same files. Converging the CLI onto `core/` is a
  follow-up.
- The web UIs are still German; the English rewrite is PR3.

## 12. Glossary

| Term            | Meaning                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| Bewerbungsmappe | Application bundle: cover letter + CV + attachments merged into one PDF. |
| Application     | A submitted job application (company, position, status, archived PDF).   |
| myJob           | The recruiting/applicant app under `myjob/`.                             |
