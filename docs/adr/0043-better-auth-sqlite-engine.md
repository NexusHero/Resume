# ADR-0043 — Better-Auth credential/session engine (embedded SQLite)

- **Status:** Accepted (engine landed; live cutover staged — see Consequences)
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
- **The live cutover is staged, on purpose.** Re-pointing `AuthService` at the
  engine (with the scrypt→Better-Auth **rehash-on-login** path so no user is
  forced to reset, and DSGVO session revocation via the engine) is the follow-up
  commit. Auth is breach-consequential and browser login cannot be exercised in
  CI or this environment, so the cutover ships behind an on-device smoke-test —
  the same honesty bound this project applies to every auth change. Until then the
  proven scrypt/`SessionStore` path remains the default and behaviour is unchanged.
- 2FA/passkeys (Better-Auth plugins) become incremental once the engine is live.
