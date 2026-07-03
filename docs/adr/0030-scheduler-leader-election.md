# ADR-0030 — Scheduler leader election via Postgres advisory locks

- **Status:** Accepted (D-series, slice 2)
- **Relates to:** ADR-0029 (Postgres-mandatory in production), ADR-0013 (the assistant scheduler), ADR-0002 (DI/composition root)

## Context

The composition root runs three periodic jobs as `setInterval` timers: the
assistant playbook (`runIfDue`, every minute), IMAP reply sync, and the retention
auto-anonymize sweep. ADR-0029 makes Postgres mandatory in production, which
unlocks horizontal scaling — but each extra instance also runs these timers, so
the assistant would fire N times a minute, retention would sweep N times, and
reply polling would N-fold the IMAP load. The jobs are the one thing that must
**not** run per-instance. This was the explicit gap ADR-0029 left open.

## Decision

Gate every scheduled tick through a `SchedulerLock` port with two adapters,
selected by store (mirroring the fs/sql adapter split, ADR-0003):

- **`SchedulerLock.runExclusive(key, task)`** runs `task` iff this instance holds
  the named lock, returning whether it ran. Distinct keys per job
  (`assistant`, `reply-sync`, `retention`) so the jobs are elected
  independently — one busy job never starves another.
- **`NoopSchedulerLock`** (filesystem store / single instance): always the
  leader, always runs. No coordination where none is needed.
- **`PgAdvisorySchedulerLock`** (Postgres): each tick takes a **non-blocking
  session advisory lock** (`pg_try_advisory_lock`) on a dedicated pooled client;
  only the winner runs the task, and the lock is released with
  `pg_advisory_unlock` on the **same** client in a `finally` (session advisory
  locks are connection-scoped). A crashed leader's session ends and Postgres
  drops the lock, so the next tick re-elects automatically — no lease renewal,
  no stale-lock recovery to write. The lock id is a stable, namespaced FNV-1a
  hash of the job key, kept a positive safe integer so it can't collide with
  another application's advisory locks by accident.
- Wired in the composition root (`index.ts`), where the timers already live —
  the lock is a boot concern, not a request-path dependency.

## Consequences

- The app tier is now genuinely horizontally scalable behind Postgres: run as
  many instances as needed and each timed job still fires once per interval,
  cluster-wide. No dedicated worker instance or external scheduler is required.
- Per-tick try-lock (rather than a long-held lease) means re-election is
  automatic and there is no lock to clean up after a crash — the trade is that a
  long assistant run holds one pooled connection for its duration; acceptable for
  a single background job, and short jobs release immediately.
- Only the scheduled jobs are coordinated; HTTP requests remain fully stateless
  and unaffected. Object storage for the PDF archive (D2) and a Puppeteer render
  pool (D4) are the remaining scale follow-ups.
- Covered by unit tests against a fake pool (lock won → runs + unlocks + releases;
  lost → skips, no unlock; task throws → still unlocks + releases + propagates)
  plus the no-op and key-hash behaviour. The real advisory-lock semantics are
  exercised by the `DATABASE_URL`-gated integration environment.
