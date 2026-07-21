# ADR-0056 — Availability hardening batch: PDF, migrations, rate limiting, scheduler, shutdown, circuit breaker

- **Status:** Accepted
- **Relates to:** ADR-0029 (readiness gate), ADR-0030 (scheduler leader
  election), ADR-0036/0037/0038 (self-serve tenants), ADR-0043 (Better-Auth,
  incl. its own Postgres pool), ADR-0049 (PDF browser, job resilience, AI rate
  limit), ADR-0050 (job-source registry)

## Context

A pass over "what would it take to run this at maximum availability"
surfaced eight gaps, none about a missing feature — all about the running
system surviving load, restarts, and horizontal scale-out gracefully instead
of degrading silently:

1. **The PDF renderer could poison itself.** `PuppeteerPdfRenderer.browser()`
   memoized the **launch promise**. A single transient launch failure, or a
   later Chromium crash, left a rejected/dead promise cached forever — every
   PDF export failed until the process was restarted.
2. **Concurrent cold starts raced on migrations.** Two instances booting
   against a fresh, empty `STORE=sql` database at the same time both ran the
   idempotent `CREATE TABLE IF NOT EXISTS` DDL unsynchronized; reproduced
   empirically, one instance crashed with
   `duplicate key value violates unique constraint "pg_type_typname_nsp_index"`.
3. **No container healthcheck.** `/api/v1/health` existed but nothing polled
   it — an orchestrator (Docker/Compose/k8s) had no signal to detect a hung
   instance or gate a rolling deploy on the new one actually serving traffic.
4. **No graceful shutdown.** `SIGTERM`/`SIGINT` closed the Nest app and the
   auth engine but never released the Postgres pool or the PDF renderer's
   Chromium process, and nothing bounded a hang — a stuck close could wedge
   the process indefinitely.
5. **Rate-limiter state was per-instance.** `AuthRateLimitGuard` and
   `AiRateLimitGuard` (ADR-0049) kept their counts in an in-process `Map` —
   correct for the single-instance `STORE=fs` default, but under `STORE=sql`
   (by definition multi-instance) each instance enforced its own limit, so
   the _effective_ limit multiplied by instance count.
6. **Scheduled jobs only ever ran for one tenant.** The assistant, retention
   and reply-sync tickers (`index.ts`) always ran against `TEAM_SCOPE`
   (the implicit default tenant) — harmless for a single-tenant deployment,
   but under `SELF_SERVE_TENANTS=true` every self-registered tenant has its
   own scope, and their scheduled jobs silently never ran.
7. **No circuit breaker for job boards.** `resilientFetch` (ADR-0049) absorbs
   one transient blip with a timeout + bounded retry, but a board that is
   genuinely down for an extended stretch still paid the full timeout+retry
   cost on every single search, hammering a dead upstream indefinitely.
8. **The Postgres connection budget was undocumented.** Each instance opens
   more than one pool (the main Drizzle pool, and — since ADR-0043 — a
   dedicated Better-Auth pool), and nothing spelled out how that multiplies
   with instance count or what a deployer should size `max_connections` for.

## Decision

- **PDF renderer:** `browser()` now captures the in-flight launch promise in
  a local, and only clears `this.browserPromise` back to `null` — on launch
  rejection, or on the resulting browser's `disconnected` event — when that
  slot still holds the _same_ promise (a reference-equality guard against a
  stale attempt clobbering a newer, already-relaunched one). The next call
  after any failure launches fresh instead of replaying a poisoned promise.
- **Migrations:** `db.ts`'s `migrate()` wraps the whole DDL block in a
  **blocking Postgres advisory lock** (`pg_advisory_lock`/`pg_advisory_unlock`
  on a dedicated client, released in a `finally`), keyed via the existing
  `lockId()` FNV-1a helper shared with the scheduler lock (ADR-0030). Two
  instances cold-booting simultaneously now serialize instead of racing.
  Verified by reproducing the exact failure against a fresh database (two
  real server instances booting at once) both before (one crashes) and after
  (both boot cleanly) the fix.
- **Healthcheck:** the Dockerfile adds `HEALTHCHECK` (Node's own `http` client
  — the slim image ships neither `curl` nor `wget`) against
  `/api/v1/health`; `docker-compose.yml`'s `app` service gets a matching
  `healthcheck:` block, plus a placeholder `APP_SECRET` so `docker compose up`
  boots out of the box instead of crash-looping on an unset secret (the
  placeholder is clearly marked "NOT safe for a real deployment").
- **Graceful shutdown:** `index.ts`'s `shutdown()` now awaits `app.close()`
  first (draining in-flight HTTP requests), _then_ releases the auth engine,
  the PDF renderer (`PdfRenderer.close?()`, a new optional port method — only
  `PuppeteerPdfRenderer` implements it, closing its Chromium process), and
  the main `pg.Pool`. A `setTimeout` force-exits after 10s if any of that
  hangs, so a stuck shutdown can't wedge the process. Verified with a real
  `STORE=sql` boot + `SIGTERM`: clean exit, no leftover process.
- **Shared rate limiting:** a new `RateLimiter` port
  (`hit(key, windowMs): Promise<{count}>`) with two adapters —
  `InMemoryRateLimiter` (per-process `Map`, the existing sweep-every-200-hits
  behavior, used for `STORE=fs`) and `SqlRateLimiter` (a Postgres-backed
  atomic `INSERT ... ON CONFLICT DO UPDATE` counter in a new
  `rate_limit_windows` table, used for `STORE=sql`). `InfraModule` selects the
  adapter by `config.store`; both rate-limit guards now inject the port
  instead of managing their own `Map`. `SqlRateLimiter` reuses the existing
  Drizzle pool (`db.$client`) rather than opening a second one — see the
  connection-budget note below. Verified against a real Postgres, including a
  same-key hit from two independently-constructed `SqlRateLimiter` instances
  over two separate pools sharing one counter (standing in for two app
  instances) and ten concurrent hits each getting a distinct serialized
  count.
- **Scheduler multi-tenant scope:** `index.ts` now resolves the scopes a
  scheduled job tick must cover via `TenantService.list()` (the same
  "registry + implicit default when populated" logic the super-admin console
  already relies on) whenever `config.selfServeTenants` is true, falling back
  to `[TEAM_SCOPE]` otherwise (unchanged behavior for every current
  single-tenant deployment). One tenant's job failure is logged and does not
  block the others in the same tick.
- **Circuit breaker:** a new `circuitBreaker(inner: HttpFetch, opts):
HttpFetch` wraps `resilientFetch`'s output — closed → open (fail fast, no
  network call) → half-open (one trial) → closed on success / back to open on
  a failed trial. `job-source-factory.ts` gives every board **its own**
  breaker instance (never shared), so one dead board fails fast without
  affecting its healthy neighbors. Thresholds are config-driven
  (`JOB_SOURCE_CIRCUIT_THRESHOLD`, default 5; `JOB_SOURCE_CIRCUIT_RESET_MS`,
  default 60s), mirroring the existing `JOB_SOURCE_TIMEOUT_MS`/
  `JOB_SOURCE_RETRIES` pattern.

### Postgres connection budget (per instance)

Each running instance now holds up to three independent pools when
`STORE=sql`:

| Pool              | Owner                         | Notes                                                                      |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------- |
| Main Drizzle pool | `db.ts` / `createDb()`        | Domain data, migrations, and now `SqlRateLimiter` (reused, not a new pool) |
| Better-Auth pool  | `BetterAuthEngine` (ADR-0043) | Dedicated — Better-Auth owns whatever database object it's handed          |
| —                 |                               | `SqlRateLimiter` deliberately does **not** open a third pool               |

Total connections ≈ `(main pool size + Better-Auth pool size) × instance
count`, plus whatever the scheduler-lock/migration advisory-lock clients hold
transiently (one short-lived client per lock acquisition, released
immediately after). Both pools default to `pg`'s library default pool size
unless configured. A deployer scaling out horizontally should size
Postgres's `max_connections` (or front it with PgBouncer) for that product,
not just the main pool — this was previously undocumented.

## Consequences

- A transient PDF-launch failure or a later Chromium crash self-heals on the
  next request instead of requiring a process restart.
- Horizontal cold starts against a fresh database no longer race.
- Orchestrators can detect and route around an unhealthy instance;
  `docker compose up` works without manual secret setup (dev-only default).
- A hung shutdown force-exits instead of leaving a zombie process; the
  Chromium process and the Postgres pool no longer leak on restart.
- The credential brute-force guard and the AI-spend guard enforce one true
  limit across a horizontally-scaled `STORE=sql` deployment instead of an
  effective limit that multiplies with instance count; `STORE=fs` behavior
  (single instance, in-process Map) is unchanged.
- Self-serve tenants' retention/assistant/reply-sync jobs actually run;
  single-tenant deployments see no behavior change.
- A dead job board fails fast after a handful of failures instead of paying
  full timeout+retry cost on every search indefinitely; other boards are
  unaffected.
- The Postgres connection budget is now an explicit, sizeable quantity
  instead of an implicit surprise at scale-out time.
- None of the above changes behavior for a correctly-configured
  single-instance, single-tenant dev run — every new code path is either
  gated on `config.store === 'sql'` or `config.selfServeTenants`, or is a
  pure bug fix (PDF self-healing, graceful shutdown) with no config surface.
