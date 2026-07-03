# ADR-0012 — Hand-maintained OpenAPI contract + self-hosted Swagger UI

- **Status:** Accepted
- **Relates to:** ADR-0001, ADR-0004

## Context

The REST surface has grown to ~50 endpoints across auth, recruiting, documents/AI,
settings, team and DSGVO. `server/openapi.yaml` only covered the original applicant-side
API and was served nowhere — there was no browsable, executable API reference. Options
considered: generate the spec from the zod schemas (e.g. `zod-to-openapi`), generate
code from a spec-first contract, or maintain the contract by hand; and for the viewer,
a CDN-loaded Swagger UI vs self-hosted assets.

## Decision

- **Hand-maintained contract.** `server/openapi.yaml` (OpenAPI 3.1) is the reviewed,
  versioned source of truth, extended in the same PR as any route change (checked in
  review like the CHANGELOG). Generation from zod was rejected for now: it would wire
  an annotation library through every domain schema for marginal gain, and the zod
  schemas only describe _requests_ — response shapes would still be hand-written.
- **Self-hosted Swagger UI.** `/api/v1/docs` serves a minimal page whose assets come
  from the installed `swagger-ui-dist` package; `/api/v1/openapi.yaml` serves the
  contract. No CDN — the same reasoning as the self-hosted fonts (DSGVO, offline,
  supply-chain): no request leaves the browser. The page runs under a strict CSP
  (`script-src 'self'`, no inline scripts; the initializer is served as its own file).

## Consequences

- Every endpoint is browsable and executable (cookie sessions work from the UI since
  it is same-origin) — onboarding and client integration no longer require reading
  controller code.
- The contract can drift from the code; the guard is review discipline plus the
  acceptance tests that pin the docs endpoints. If drift becomes a real problem,
  contract tests (validate responses against the spec) are the next step — cheaper
  than switching to full spec generation.
- One new runtime dependency (`swagger-ui-dist`, static assets only, no server code).
