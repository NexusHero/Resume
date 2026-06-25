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

_TODO (PR2): document `core/` building blocks (HTTP layer, application service, PDF renderer,
application repository, git versioner) with a level-1 white-box diagram._

## 6. Runtime View

_TODO (PR2): sequence diagrams for `POST /api/v1/build` (render CV + letter, merge, archive,
commit) and `PATCH /api/v1/applications/:id`._

## 7. Deployment View

_TODO (PR4): local run, and the tag-triggered release pipeline producing per-OS artifacts._

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

Quality tree and concrete scenarios — _TODO (PR4)_. Headline target: **≥ 90 %** coverage,
mutation testing as a quality guard.

## 11. Risks and Technical Debt

- Legacy `tools/*.js` backend is untyped and hard to test → being replaced by `core/` (PR2).
- `store.js` currently mixes persistence + git + history + HTML build (SRP violation) → split in PR2.

## 12. Glossary

| Term            | Meaning                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| Bewerbungsmappe | Application bundle: cover letter + CV + attachments merged into one PDF. |
| Application     | A submitted job application (company, position, status, archived PDF).   |
| myJob           | The recruiting/applicant app under `myjob/`.                             |
