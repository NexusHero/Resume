# ADR-0032 — Bounded PDF render pool

- **Status:** Accepted (D-series, slice 4)
- **Relates to:** ADR-0029/0030/0031 (production readiness + horizontal scale)

## Context

PDF export drives headless Chromium via Puppeteer (`PuppeteerPdfRenderer`). It
already reuses **one** browser per process (launched lazily), opening a fresh
page per render — so it does not pay a browser launch per request. The remaining
scale risk is the other direction: **page concurrency is unbounded.** A burst of
exports (many recruiters printing dossiers at once, or an autopilot run
generating packets) opens an unbounded number of Chromium tabs on that one
browser, and Chromium memory per page is large — enough to OOM the instance.

## Decision

Cap concurrent renders with a small counting **`Semaphore`**:

- A dependency-free `Semaphore(permits)` with `run(fn)` that acquires a permit,
  runs `fn`, and releases it (even on throw), handing a freed permit straight to
  the next FIFO waiter. Pure logic, unit-tested directly.
- `PuppeteerPdfRenderer` routes every render through the semaphore via one
  `withPage(fn)` helper that also centralises the page open/close (removing the
  three copies of the newPage/try/finally dance). Concurrency is
  `PDF_RENDER_CONCURRENCY` (default 2).
- Still **one shared browser** per instance — the pool bounds pages, not
  browsers. That's the memory lever; a multi-browser pool would add process
  overhead for little gain at this scale.

## Consequences

- A flood of PDF requests now queues instead of spawning unbounded tabs: peak
  memory is bounded by `PDF_RENDER_CONCURRENCY`, and throughput scales by adding
  instances (each with its own bounded pool) rather than risking one instance.
  Requests past the cap wait their turn rather than failing.
- The renderer stays real-Chromium I/O and is excluded from unit coverage (as
  before); the extracted `Semaphore` — where the concurrency logic actually lives
  — is 100% covered (caps concurrency, drains FIFO, releases on throw, floors a
  non-positive permit count to 1 so it can never deadlock).
- This is a per-instance safeguard, complementary to the leader lock (ADR-0030,
  which bounds scheduled jobs) and the shared archive (ADR-0031). Together they
  close the D-series scale items that are verifiable in code; a true throughput
  benchmark remains a deployment-time exercise.
