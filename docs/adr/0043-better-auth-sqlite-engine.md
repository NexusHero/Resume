# ADR-0043 — Better-Auth credential/session engine (embedded SQLite)

- **Status:** Accepted (engine landed **and live** — `AuthService`, invites and
  password-reset now run on the engine; see Consequences)
- **Relates to:** ADR-0042 (the ESM migration that unblocked this), ADR-0002
  (Awilix DI, no decorators), ADR-0003 (file-store default / offline-first),
  ADR-0004 (authenticated, team-scoped API). Realises the framework option (C) of
  the [auth migration plan](../auth-migration-plan.md).

## Context

Authentication is the highest-consequence hand-rolled component in the suite
(scrypt hasher + opaque `SessionStore`). The [auth plan](../auth-migration-plan.md)
weighed hardening-in-place, low-level primitives, an auth **framework**, and an
external IdP — and the decision was to **delegate auth to a framework** so 2FA,
passkeys and audited crypto come for free, **without giving up offline-first**.

The framework is **Better-Auth** (self-hosted TypeScript). The offline constraint
(ADR-0003: runs on a laptop with no external service) rules out an auth server;
Better-Auth satisfies it with an **embedded SQLite** database (`better-sqlite3`) —
a local file, no server, no network. Better-Auth is ESM-only, which is exactly
why [ADR-0042](0042-esm-nodenext-migration.md) migrated the server to ESM first;
it now loads with static imports and runs under the Jest suite.

## Decision

Introduce Better-Auth behind a narrow **`AuthEngine` port** (sign up / sign in /
resolve / sign out), so credentials and sessions are the engine's job while the
domain `User` (roles, tenant, profile) stays the source of truth in
`UserRepository`, linked by email. The two-store split is the deliberate,
accepted cost of adopting the framework (per the plan's option C).

- **`BetterAuthEngine`** (`adapters/better-auth/`): `betterAuth({ database: new
Database(path), secret, emailAndPassword, plugins: [bearer()] })`. It is driven
  **headlessly** via `auth.api.*` (not by mounting Better-Auth's HTTP handler) and
  uses the **bearer** plugin, so a session is an opaque token we carry in our own
  existing session cookie — the `/api/v1/auth` surface, the cookie and every
  downstream consumer are unchanged; only the engine behind `AuthService` differs.
- Better-Auth's schema is applied at construction via `getMigrations().runMigrations()`
  (no CLI step at deploy — stays self-contained/offline).
- Password hashing, session-token randomness and storage are now the framework's
  (audited) responsibility, retiring those hand-rolled concerns.

## Consequences

- **The engine is committed, wired-ready and proven** by `better-auth-engine.test.ts`
  against a real SQLite (sign-up → sign-in → resolve → sign-out, bad-password →
  null, file persistence). It is the interchangeable half of the `AuthEngine` port.
- **Offline-first holds** — SQLite is a local file; no server, no network. The
  cost, accepted: a new native dependency (`better-sqlite3`, prebuilt binaries)
  and auth data living in SQLite alongside the JSON/Postgres domain store (two
  persistence mechanisms).
- **The live cutover has landed.** `AuthService` (register / login / logout /
  currentUser), `InviteService.accept` and `PasswordResetService.confirm` now go
  through the engine; the domain `User` keeps `passwordHash: ''` since the engine
  owns the credential. DSGVO erasure removes the engine credential + all sessions
  by email. Auth is breach-consequential and browser login cannot be exercised in
  CI or this environment, so the cutover ships behind an on-device login/logout
  smoke-test — the same honesty bound this project applies to every auth change.
- The `AuthEngine` port gained `setPassword` / `revokeSessions` / `erase` to serve
  password-reset and DSGVO erasure headlessly.
- **The legacy stack is fully removed.** The hand-rolled `SessionStore` (fs / sql /
  memory adapters + port), the `PasswordHasher` port + `ScryptPasswordHasher`, the
  `UserRepository.updatePassword` method and the SQL `sessions` table are gone —
  the engine is the sole credential + session authority. This is a **clean break,
  not a rehash-on-login migration**: any account created before the cutover (a
  non-empty `passwordHash` that never became an engine credential) can no longer
  log in and must go through password-reset to mint one. The vestigial
  `users.password_hash` column is kept (always `''` for new accounts) to avoid a
  destructive schema migration; retiring it is a separate, optional step.
- 2FA/passkeys (Better-Auth plugins) become incremental now that the engine is live.

## Update — Postgres-backed engine for horizontal scaling (#227)

The embedded-SQLite engine is **per-instance**: it satisfies offline-first, but
it also meant `STORE=sql` (the flag `config-validation.ts` already requires for
a horizontally-scaled deployment, since the filesystem store can't be shared)
did not actually make the app stateless — credentials and sessions stayed on
each instance's own local file, so two instances behind a load balancer kept
disjoint accounts.

`BetterAuthEngine.create()` now takes an optional `postgresUrl`. When set (the
`InfraModule` factory passes `config.databaseUrl` whenever `config.store ===
'sql'`), Better-Auth is backed by a **dedicated `pg.Pool`** instead of the
SQLite file — Better-Auth's Kysely adapter auto-detects the dialect from what
it is handed (`pg.Pool` → `PostgresDialect`), so every other line of the engine
is unchanged. The pool is dedicated (not the app's main Drizzle pool) because
Better-Auth's adapter owns whatever database object it is given; sharing the
main pool would couple two independent consumers to one connection budget for
no benefit. The engine owns and closes this pool (`BetterAuthEngine.close()`,
wired into `index.ts`'s shutdown handler via the new optional `AuthEngine.close()`
port method).

`STORE=sql` now means every store — domain data **and** auth — is shared.
`dbPath`/embedded SQLite remains the default and is unaffected.

Verified against a real Postgres at three levels (`postgresUrl` is not
mockable — Better-Auth's dialect auto-detection and migrations are exercised
for real): `better-auth-engine.test.ts` (SQLite, unchanged),
`better-auth-postgres.integration.test.ts` (gated on `DATABASE_URL`, two
independently-constructed engines sharing accounts/sessions against one
Postgres), and a manual end-to-end run of two full server instances on
different ports against one Postgres — register via instance A, log in via
instance B with the same credentials, and resolve instance A's session cookie
via instance B.

That end-to-end run also surfaced a pre-existing, unrelated bug it would
otherwise have masked: `AppModule`'s static `imports` listed the bare
`PersistenceModule` **in addition to** the `PersistenceModule.forRoot(db)` the
dynamic module always supplies, so the two competing `DB` providers didn't
merge as intended and a real `STORE=sql` boot failed before ever reaching the
auth engine. Fixed by dropping the redundant static import — `AppModule` is
only ever constructed via `.forRoot()`, so nothing else relied on it. This path
had no test coverage (the acceptance harness bypasses `AppModule`/
`PersistenceModule`/`InfraModule` entirely with fakes), which is why it went
undetected until now.
