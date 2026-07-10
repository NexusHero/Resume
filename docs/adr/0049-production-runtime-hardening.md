# ADR-0049 — Production runtime hardening: PDF browser, job-source resilience, AI rate limit

- **Status:** Accepted
- **Requirements:** NFR-11, NFR-12, FR-21, FR-50
- **Relates to:** ADR-0029 (readiness gate), ADR-0031/0032 (PDF archive/pool), ADR-0045 (live job boards)

## Context

A hands-on production test surfaced three ways the running system was not yet
production-safe — none about features, all about how it runs:

1. **PDF rendering was broken in the production image.** The `node:24-slim`
   runtime shipped no Chromium and none of the shared libraries Puppeteer needs,
   so every PDF render (CV, dossier, autopilot Mappe) would fail at runtime.
2. **The job search was fragile.** The default install queries a single external
   board over an `HttpFetch` with **no timeout and no retry** — a hung board
   blocks the whole search (the composite awaits every source) and a single blip
   empties the results.
3. **The generative AI routes had no rate limit.** Only `/auth/*` was throttled;
   the token-spending routes (`/documents/ai|parse|ats|pitch|outreach|translate`,
   `/mandates/*/candidates/*/…`, `/compliance/agg-rewrite`, `/cover-letter`) were
   unbounded, so one caller could exhaust the owner's LLM budget.

## Decision

- **Ship a browser in the runtime image.** The Dockerfile installs a system
  Chromium + fonts, sets `PUPPETEER_EXECUTABLE_PATH`, and skips Puppeteer's own
  download (`PUPPETEER_SKIP_DOWNLOAD`). The launcher honours the env var
  (`puppeteerLaunchOptions`, unit-tested).
- **Wrap every board request in `resilientFetch`** — a per-attempt timeout
  (`JOB_SOURCE_TIMEOUT_MS`, default 8 s) and a bounded retry with backoff
  (`JOB_SOURCE_RETRIES`, default 1). A source that still fails is skipped by the
  composite; if all fail the search reports `liveSourcesDown` (ADR-0045), never
  hangs.
- **Throttle the generative AI routes per user** with an `aiLimiter`
  (`AI_RATE_LIMIT_PER_MINUTE`, default 30, `0` disables), keyed by the acting
  user, returning `429 problem+json`. Also align `BETTER_AUTH_SECRET` with the
  resolved `APP_SECRET` so the auth engine's warning is not misleading (the
  secret itself is already covered by the readiness gate).

## Consequences

- PDF export works in the container; the browser is an explicit, pinned image
  dependency rather than an implicit npm postinstall download.
- A slow or flaky board degrades gracefully (timeout → skip → honest empty)
  instead of hanging or silently emptying the search.
- AI spend is bounded per user; the limit is config-only and off by default in
  tests. None of these change behaviour for a correctly-configured single-tenant
  dev run.
