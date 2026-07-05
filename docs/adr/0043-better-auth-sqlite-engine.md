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
