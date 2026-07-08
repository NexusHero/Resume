# ADR-0045 — No fabricated job data; live boards only

- **Status:** Accepted
- **Requirements:** FR-50, FR-52, NFR-05

## Context

The job search shipped with a curated `SampleJobSource` used as an offline
fallback: when no live board was configured — which was the **default**, since
`JOB_SOURCES` was unset — the search served nine hand-written postings (Celonis,
GitLab, …). It also served that sample whenever every live source failed on a
search. Operators reported the product "only ever shows mock jobs": a fresh
install never queried a real board, and the fabricated postings were
indistinguishable enough from real ones to be mistaken for production data. This
contradicts the trust/honesty stance (NFR-05, "the UI never shows fabricated
data") and the first-party-data positioning (ADR-0006).

## Decision

Remove fabricated job data entirely and query **real boards only**:

- Delete `SampleJobSource` and its use as a fallback.
- Default `JOB_SOURCES` to the **keyless, real Arbeitnow board**, so a plain
  install queries live postings out of the box. `JOB_SOURCES=""` opts out and
  yields an `EmptyJobSource` (an honest empty result), never a sample.
- When every configured live source fails on a search, `JobSearchService`
  returns an **empty list with `liveSourcesDown: true`** instead of substituting
  sample postings. The Matching view renders an outage notice ("live sources are
  unreachable"), not fabricated roles.

Deterministic tests inject a `FakeJobSource` fixture through the same
`JobSource` port — test scaffolding, never shipped in the production wiring.

## Consequences

- A fresh install shows real openings immediately, and an outage is stated
  honestly rather than masked by mock data — reinforcing NFR-05 and ADR-0006.
- Offline/CI job search returns nothing unless a source is injected; tests use
  `FakeJobSource`, and the composition root no longer registers any sample.
- Arbeitnow-by-default adds an outbound dependency on first run; it is skippable
  (`JOB_SOURCES=""`) and degrades to an empty, clearly-labelled result.
