# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### Added

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
