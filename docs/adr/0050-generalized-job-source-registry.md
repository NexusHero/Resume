# ADR-0050 — Generalized job-source registry: all boards on, declarative descriptors, accumulated per-source counts

- **Status:** Accepted
- **Requirements:** FR-50, FR-52, FR-53, NFR-12
- **Relates to:** ADR-0045 (no fabricated data; live boards only), ADR-0049 (job-source resilience)

## Context

The job search already fanned out across several boards via `CompositeJobSource`
(parallel, failure-isolated, deduped), but three things were in the way of "tap
every board at once":

1. **Only Arbeitnow was on by default.** `JOB_SOURCES` was an opt-in allow-list
   defaulting to a single board, so a plain install queried one source — and if
   that one was unreachable, the search returned nothing (exactly what a hands-on
   test hit: `liveDown=true, total=0`).
2. **Every board needed a bespoke adapter class.** Adding a source meant writing
   and wiring TypeScript. There was no way to add a board declaratively, let
   alone at runtime.
3. **The result flattened away per-source information.** The UI could not show
   how many postings each API contributed, nor which board was down.

## Decision

- **All sources on by default.** `JOB_SOURCES` becomes a *legacy allow-list*
  override: unset → every configured board is enabled; an explicit list restricts
  to those names; `""` turns them all off (the honest empty search). A new
  `JOB_SOURCES_DISABLED` deny-list turns a single board off while the rest stay
  on. The keyless boards (Arbeitnow, Bundesagentur) are therefore both on out of
  the box; Adzuna joins automatically once its credentials are set.
- **Declarative `JobSourceDescriptor` + generic `RestJobSource`.** A board with a
  plain REST/JSON API is described by a data object (endpoint, params, auth,
  `itemsPath`, dot-path field mapping, salary/date/HTML handling, optional
  client-side filter) and interpreted at runtime — no bespoke class. Boards with
  quirks that don't fit the descriptor (Adzuna credentials, Bundesagentur's
  `X-API-Key` + detail-URL fallback) keep their hand-written adapter. Built-in
  descriptor boards ship for **Remotive, Jobicy and Remote OK** (keyless, free).
- **Config-file extensibility now; runtime UI later.** `JOB_SOURCES_FILE` points
  at a JSON array of descriptors merged into the registry at boot; a malformed
  file is logged and skipped, never fatal. A runtime admin UI to add sources
  (persisted, hot-loaded, admin-gated, SSRF-guarded) is deferred — the descriptor
  model is the seam it will write to.
- **Accumulated per-source counts.** `CompositeJobSource.searchDetailed` returns a
  per-board breakdown `{ name, count, ok }`; the search result carries
  `sources[]`; Matching shows the accumulated total across all API sources plus a
  per-board chip row, with unreachable boards struck through.

## Consequences

- A plain install fans a single search out across all keyless boards at once, so
  one board being down no longer empties the search — directly the resilience the
  hands-on test wanted.
- Adding a well-behaved board is now data, not code: a descriptor (built-in or in
  `JOB_SOURCES_FILE`). Odd boards still get a real adapter; both register
  uniformly and share the resilient fetch, dedup and per-source counting.
- The UI makes coverage legible: "N jobs across M/K sources" with per-board
  counts. `ok:false` boards are visible rather than silently absent.
- No fabricated data (ADR-0045) is unchanged: with every source off or down the
  search is honestly empty with `liveSourcesDown`.
