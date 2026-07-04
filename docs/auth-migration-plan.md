# Plan — Authentication hardening & migration

> **Status: Plan (not yet decided).** This is a proposal to be turned into ADRs
> when approved — it changes nothing on its own. It follows the suite's rule that
> significant choices are captured as [ADRs](adr/README.md); the phases below map
> to future ADRs, one per accepted slice.
>
> Companion reading: [security concept](security.md) · [architecture](architecture.md)
> · [decisions](adr/README.md). Auth touches ADR-0002 (Awilix DI, no decorators),
> ADR-0003 (file-store default / offline), ADR-0004 (authenticated, team-scoped API).

## 1. Why this plan

Authentication is the **highest-consequence hand-rolled component** in the suite:
an ATS holds candidate personal data (DSGVO), recruiter accounts and per-user LLM
keys, so an auth bug is a breach, not a glitch. The current implementation is
sound for its scale, but "sound and small" is exactly where you want to adopt
**audited packages** before the surface grows (2FA, WebAuthn, SSO for agency
buyers). This plan applies the suite's standing principle — _use good packages
where they earn their place rather than hand-rolling_ (the Workbox/PWA change,
ADR-0041, is the most recent example) — to the auth stack, **without giving up
the offline-first core**.

## 2. Where we are today (honest inventory)

Everything already sits behind hexagonal **ports** (ADR-0001/0002), which is what
makes this migratable adapter-by-adapter rather than as a rewrite:

| Concern            | Today                                                                                             | Port / seam                               |
| ------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Password hashing   | Node built-in **scrypt**, `scrypt$salt$key`, constant-time verify, no native dep                  | `ports/password-hasher.ts`                |
| Sessions           | **Opaque server-side** token → userId; fs / memory / SQL adapters; suspension kills live sessions | `ports/session-store.ts`                  |
| Authorization      | Role + resource/action check via the `requireCan` route seam                                      | `ports/authorizer.ts`                     |
| Password reset     | Single-use token store + service                                                                  | `ports/password-reset-token-store.ts`     |
| Email verification | Soft verification token store                                                                     | `ports/email-verification-token-store.ts` |
| Transport          | `httpOnly` cookie session, CORS + security headers, rate limit on the API                         | `http/security.ts`, `http/create-app.ts`  |

**Strengths (keep these):** ports everywhere, no external dependency, offline by
default, constant-time verify, sessions revocable and revoked on suspension /
DSGVO erase.

**Gaps worth closing:**

1. **Hash algorithm.** scrypt is OWASP-acceptable, but **argon2id** is the current
   first recommendation, and our scrypt uses library-default cost parameters
   (not tuned/forwards-upgradable).
2. **Session token at rest.** The token is stored as-is; best practice is to store
   only a **hash** of it, so a store leak doesn't hand out live sessions.
3. **No session rotation** on privilege change / password reset, and **no account
   lockout / throttling** on repeated failed logins (only coarse API rate-limit).
4. **Bespoke crypto glue.** Small, but every hand-rolled line in auth is line we
   could delegate to an audited primitive.
5. **No 2FA / WebAuthn / passkeys** — fine today, but the moment an agency buyer
   asks, we don't want to hand-roll TOTP or WebAuthn.

## 3. Constraints (non-negotiable)

- **Offline-first stays.** A recruiter must still install and run with **no
  external service** — no IdP, no auth SaaS (ADR-0003). This is why **Keycloak was
  rejected**: it's a separate always-on service in Docker Compose and breaks the
  "works on a laptop with no internet" property.
- **Ports stay.** Any library goes _behind_ `PasswordHasher` / `SessionStore` /
  `Authorizer`, not into the call sites. No decorators, no service locator
  (ADR-0002).
- **No forced credential reset.** Existing users' scrypt hashes must keep working
  through any hasher change (see §6, verify-old / rehash-on-login).
- **DSGVO invariants hold.** Erase/anonymize/export and session revocation keep
  working through the personal-data registry.

## 4. Options considered

| Option                                               | What it is                                                                                                                     | Offline-first            | Fit to our architecture                                              | Verdict                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------- | ----------------------------------------------- |
| **A. Harden in place**                               | Keep the hand-rolled adapters; tune params, hash tokens at rest, add rotation + lockout                                        | ✅ full                  | Trivial — same ports                                                 | **Do the cheap wins now**                       |
| **B. Low-level primitives (Oslo)**                   | Replace bespoke crypto with audited primitives (password hashing, session tokens, TOTP, WebAuthn) — a toolkit, not a framework | ✅ full                  | Excellent — primitives drop in behind the existing ports             | **Recommended core of the migration**           |
| **C. Auth framework (Better-Auth)**                  | Self-hosted TS auth framework: owns user/session tables, ships email/password, 2FA, passkeys, org/RBAC                         | ✅ (self-hosted, own DB) | Heavier — it wants to own the user/session model; reshapes our ports | **Defer** — adopt only when we need its breadth |
| **D. External IdP (Keycloak / Zitadel / Authentik)** | A dedicated auth server the app federates to (OIDC)                                                                            | ❌ breaks it             | Would invert the offline story                                       | **Rejected** (already decided)                  |

**On "NestJS / a backend framework migration."** NestJS is a _backend structure_
framework (decorator-based modules + its own DI), **not** an auth solution — under
NestJS you would still add exactly the auth packages above (Passport, Better-Auth,
Oslo). Adopting it would be a **whole-backend rewrite** that reverses ADR-0002
(no decorators, single Awilix root) for no auth benefit. It is therefore **out of
scope for this plan** and not recommended as an auth measure. The valid, shared
idea underneath it — _"prefer good packages"_ — is already how we work; this plan
is that principle applied to auth. (If a NestJS migration is wanted on its own
merits, it deserves its own separate evaluation, with the rewrite cost stated
plainly.)

## 5. Recommendation

A **phased hardening**, keeping the architecture and going offline-first the whole
way: **A (cheap wins) + B (Oslo primitives behind the ports)** now; **C
(Better-Auth) deferred** behind a feature need (2FA/passkeys/SSO) — and even then
evaluated as "adopt behind our ports" vs "hand the model over."

For the **hasher specifically**: move to **argon2id**. Two ways to get it:

- `@node-rs/argon2` — Rust, **prebuilt binaries** (no `node-gyp`, no build
  toolchain), the lowest-friction native option; or
- keep **Node scrypt but tuned** (raise cost, make params forwards-versioned) if
  we want to hold the line on _zero_ native dependencies.

Recommend **argon2id via `@node-rs/argon2`**, with the existing scrypt hasher kept
as a **verify-only fallback** so old hashes still log in and get **upgraded on next
login** (§6). The one honest trade-off to accept: it adds a prebuilt-binary native
dependency, which nudges the "pure-JS, no native deps" value — small, and worth it
for the algorithm upgrade, but it should be a conscious call.

## 6. Password-hash migration (zero downtime, no forced reset)

A `CompositePasswordHasher` behind the existing `PasswordHasher` port:

1. `hash()` → always argon2id (new format tag, e.g. `argon2id$…`).
2. `verify()` → dispatch on the stored tag: `argon2id$…` → argon2 verify;
   `scrypt$…` → the current scrypt verify.
3. On a **successful login against a scrypt hash**, re-hash the password with
   argon2id and persist it (needs a `userRepository.updatePasswordHash`).

Result: no user is forced to reset, hashes upgrade organically, and once telemetry
shows no scrypt hashes remain the fallback can be removed.

## 7. Phased steps (each its own PR)

| Phase | Slice                                                                                                      | Effort | Offline-first | Future ADR  |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------ | ------------- | ----------- |
| P1    | **Cheap wins:** hash session tokens at rest, session rotation on reset/priv-change, login lockout/backoff  | S–M    | ✅            | one ADR     |
| P2    | **argon2id hasher** + `CompositePasswordHasher` fallback + rehash-on-login (§6)                            | M      | ✅            | one ADR     |
| P3    | **Oslo primitives** behind the session / token ports (audited token generation, constant-time, TOTP-ready) | M      | ✅            | one ADR     |
| P4    | **2FA (TOTP)** as an opt-in, using Oslo — behind the same ports, off by default                            | M–L    | ✅            | one ADR     |
| P5    | _(optional, on demand)_ **WebAuthn / passkeys**, or re-evaluate **Better-Auth** if breadth is needed       | L      | ✅            | ADR + spike |

Every phase: adapter swap behind an existing port, a test that locks the new
behaviour (incl. the verify-old / upgrade path), no call-site churn, and the
offline default preserved.

## 8. Risks & de-risking

- **Auth is high-consequence** → each phase is small, behind a port, and lands with
  tests before the next. P2 ships the fallback path _with_ its own test proving old
  scrypt hashes still authenticate and upgrade.
- **Native-dep friction** (argon2) → mitigated by choosing the **prebuilt** Rust
  binding; CI already runs on a fixed Node, and the file-store/offline path is
  unaffected. If a target lacks a prebuilt binary, the scrypt fallback still logs
  users in.
- **Lock-in** (Better-Auth owning the model) → the reason it's deferred and, if
  ever adopted, wrapped behind our ports rather than exposed to services.

## 9. Non-goals

- **No Keycloak / external IdP** (breaks offline-first — decided).
- **No NestJS / backend-framework rewrite** (not an auth measure; reverses ADR-0002).
- **No social login** until a buyer needs it.
- **No forced password reset** at any point.

## 10. Decision gate

When approved, P1–P3 become three ADRs (`Proposed → Accepted`) with the composite
hasher and token-hash-at-rest as the headline decisions; P4–P5 are opened as ADRs
only when the feature is scheduled. Until then, this document is the plan of
record and the code is unchanged.
