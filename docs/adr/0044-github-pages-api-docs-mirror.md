# ADR-0044 — Read-only Swagger UI mirror on GitHub Pages

- **Status:** Accepted
- **Relates to:** ADR-0011, ADR-0012

## Context

The interactive OpenAPI reference (ADR-0012) is only browsable at `/api/v1/docs`,
which requires a running instance of the server. Anyone who wants to skim the API
surface — a prospective integrator, a reviewer, the maintainer on a phone — has to
stand up the app first. GitHub already hosts the source; GitHub Pages can host a
static mirror of the same contract at no extra infrastructure cost.

Two things needed a decision: whether the mirror ships "Try it out" (it would need
CORS opened on the real server and a hardcoded server URL, i.e. a second, smaller
attack surface on the public API), and whether to use the classic branch-based Pages
publish (a `gh-pages` branch) or the newer Actions-based one (`actions/deploy-pages`).

## Decision

- **Read-only mirror, no "Try it out".** The published page sets
  `supportedSubmitMethods: []` in the Swagger UI config, so it shows endpoints,
  schemas and examples but never sends a request anywhere. No CORS change on the
  server, no server URL baked into a public static file, no new attack surface — the
  interactive version that can actually execute calls stays where it always was,
  at `/api/v1/docs`.
- **Self-hosted assets, no CDN**, same reasoning as ADR-0011/0012: the already-vendored
  `swagger-ui-dist` package is copied into the static output alongside
  `server/openapi.yaml`, by `scripts/build-api-docs-pages.sh`.
- **Actions-based Pages deploy** (`.github/workflows/pages.yml`, triggered on any push
  to `server/openapi.yaml` plus `workflow_dispatch`), not a `gh-pages` branch: no
  extra branch to keep in sync, and the deploy is a visible, auditable CI job like
  every other workflow in this repo.
- **Default `github.io` URL, no custom domain.** Nothing to configure in DNS.

## Consequences

- Enabling this requires one manual, one-time step outside this repo's git history:
  **Settings → Pages → Source → "GitHub Actions"** — there is no API/CLI path in this
  environment to flip that toggle, so a maintainer must do it once by hand before the
  first deploy succeeds.
- The mirror can only fall behind the live `/api/v1/docs` between a spec change
  landing on `main` and the next `pages.yml` run — the path-filtered trigger keeps
  that window to "the next push that touches `server/openapi.yaml`", not an
  unbounded staleness.
- No new runtime dependency: `swagger-ui-dist` is already vendored for ADR-0012.
