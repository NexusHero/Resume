# Security concept — myJob Recruiting Suite

> The coherent security story for myJob: the trust boundary, the controls that
> guard it, and — kept honest — what is _not_ yet covered. Individual mechanisms
> live in ADRs and code; this document is the single place to read the posture
> end-to-end. Companion: [architecture](architecture.md) ·
> [requirements](requirements.md) (NFR-06) · [decisions](adr).

## 1. Assets and trust boundary

The system holds **candidate personal data** (names, contacts, CVs, interview
notes), **recruiter accounts** (password hashes, sessions), and **per-user LLM
API keys**. Everything of value sits _behind_ the REST API; the browser kit and
every external actor sit _outside_ it.

```
        ┌─────────────────────── trust boundary (the API process) ───────────────────────┐
 Recruiter ─cookie session─▶  Express app  ─▶ services ─▶ ports ─▶ adapters ─▶ store (fs / Postgres)
 External integrator ─┘        (authn, authz,                         │
 Candidate (subject) ─┘         CORS, headers,                        ├─▶ LLM providers (per-user key)
                                rate limit)                           ├─▶ job boards (read-only, no PII)
                                                                      └─▶ SMTP / IMAP (links, envelopes)
        └────────────────────────────────────────────────────────────────────────────────┘
```

Everything crossing the left edge is **untrusted** and must present a valid
session (except the small unauthenticated surface in §2). Everything crossing
the right edge is **outbound**: providers receive only the data a feature needs,
job boards receive no candidate PII, and the mailer sends links/drafts, never the
data store. The [system-context diagram](umls/03_system_context.puml) draws the
same actors; this boundary is the security lens over it.

## 2. Authentication (FR-01, FR-02, ADR-0004)

- **Sessions are opaque server-side tokens** in an `httpOnly`, `SameSite=Lax`
  cookie, `Secure` when `COOKIE_SECURE=true` (production), server-side-expiring
  after `SESSION_TTL_DAYS` (`auth-controller.ts`, `session-store`). The token is
  a random id, not a JWT — nothing sensitive lives in the cookie, and a session
  can be destroyed server-side (logout, erase, suspension) without waiting for
  expiry.
- **Passwords** are hashed with **scrypt** (`scrypt-password-hasher`); the hash
  is never returned by any endpoint (guarded by `toUserView`).
- **Password reset** is a one-time token flow (FR-02, `password-reset-service`);
  **email verification** is a soft one-time token (`email-verification-service`).
- **Unauthenticated surface** is deliberately small: register, login, request/
  confirm reset, accept-invite, the OpenAPI contract + Swagger UI. Everything
  else requires a session.

## 3. Authorization (ADR-0004, ADR-0021)

Authorization is applied at three declarative route seams:

| Seam                   | Where                                | Guards                                                       |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------ |
| `requireAuth`          | route middleware (`create-app.ts`)   | a valid session must exist                                   |
| `requirePlan` (Pro)    | `makeRequirePlan` (ADR-0021)         | plan-gated features, in one seam, never branched in services |
| `requireCan(kind,act)` | `makeRequireCan` + `role-authorizer` | admin-only actions (member re-role, retention, invites)      |

Roles today: **recruiter** (default) and **admin** (member + compliance + tenant
administration). The last-admin invariant is enforced per tenant so a team can
never lock itself out of administration.

All three seams sit at the **route edge**: `requireCan('member', 'setRoles')` is
dropped in front of a route just like `requireAuth`, so admin-only routes are
declared once in the router and no controller re-checks a role by hand. The
policy stays in one `(principal, resource, action)` table (`role-authorizer`),
so it can move to a policy engine later without touching the call sites.

## 4. Tenant isolation (ADR-0033/0034)

Recruiting data is **scope-owned**: `currentScope(req)` resolves to the user's
`tenantId` (default `'team'`), and every recruiting repository query is scoped to
it. A member of tenant A cannot read or write tenant B's mandates, talents,
candidacies, placements or observations — the scope is applied in the service
layer, not left to per-controller discipline. Member management is tenant-scoped
too: an admin only lists and re-roles their _own_ tenant's members.

## 5. Privileged access, non-escalatable (ADR-0037/0038)

- The instance **super-admin** is defined **only** by the `SUPER_ADMIN_EMAIL`
  environment variable. It is **never grantable through the API** — no endpoint,
  role change, or data write can mint a super-admin. This is a deliberate
  config-only capability so a compromised admin account cannot escalate to
  platform-wide control; the blast radius of any in-app compromise stops at a
  single tenant.
- **Tenant suspension** is enforced in the auth path itself (`auth-service.ts`):
  a suspended tenant's members cannot log in **and** their existing sessions stop
  resolving (`isTenantSuspended` returns `null` on session lookup), so suspension
  locks members out immediately rather than at next expiry.

## 6. Secrets at rest (FR-31, ADR-0029)

- **Per-user LLM API keys** are encrypted with **AES-256-GCM**
  (`secret-cipher.ts`); the key is derived via scrypt from `APP_SECRET`, and
  ciphertext is stored as `v1:base64(iv|tag|ciphertext)` so the scheme is
  versioned and tamper-evident (GCM auth tag).
- The **production readiness gate** (ADR-0029) fails fast at boot if `APP_SECRET`
  is unset (or left at the dev default) in production, so keys are never
  encrypted under a known constant on a real deployment.
- **No secrets in the repo:** `.env` is gitignored; only `.env.example` ships.

## 7. Transport, CORS and headers

- **CORS is an allow-list** (`corsMiddleware`): the default empty list sends _no_
  `Access-Control-Allow-Origin`, leaving the API **same-origin only**; a
  deployment opts specific origins in via `CORS_ORIGINS`.
- **Baseline security headers** on every response (`securityHeaders`):
  `X-Content-Type-Options: nosniff`, `Cross-Origin-Opener-Policy: same-origin`,
  and a strict **Content-Security-Policy** on the built kit (`recruitingCsp`).
- **Self-hosted assets** (ADR, DSGVO): fonts and Swagger UI ship from this
  origin — no CDN, so no third-party request leaves the recruiter's browser.

## 8. Abuse resistance and error hygiene

- **Rate limiting** on the credential endpoints: an `express-rate-limit` limiter
  with a 15-minute window (`create-app.ts`) throttles brute-force login / reset
  attempts and answers `429` as RFC-9457 problem+json.
- **RFC-9457 problem+json** for every error (`problem.ts`): stable, typed error
  bodies with no stack traces or internal detail leaked to the client.
- **zod at the boundary** (NFR-02): request bodies are validated before any
  service sees them, so malformed / injection-shaped input is rejected at the
  edge.

## 9. CSRF posture — honest assessment

The API is cookie-authenticated, so CSRF is a real threat class. Current
mitigations:

1. **`SameSite=Lax`** on the session cookie stops cross-site POST/PUT/DELETE
   driven by a third-party page (the cookie is not sent on cross-site
   state-changing requests).
2. **CORS is same-origin by default**, so a browser will not let a foreign
   origin read authenticated responses.

There is **no explicit CSRF token**. `SameSite=Lax` covers the state-changing
verbs the app uses today, but if a deployment ever needs `SameSite=None` (e.g.
the bundled-assets native mode in [native-app.md](native-app.md), or an embedded
cross-origin integration), a synchroniser-token or double-submit-cookie defence
must be added first. This is a **documented gap**, tracked below.

## 10. Data-subject rights (DSGVO — see also §privacy in architecture)

Erasure and export are not hand-listed per store — they run off a **personal-data
registry** in the composition root (`ports/personal-data.ts`): each container
that holds a user's footprint registers one erase step (and, where relevant, one
export section) once, and `AccountService` iterates it. This exists specifically
so a personal-data container cannot be silently forgotten from erase — which had
happened once with email-verification tokens. Retention/anonymisation
(`retention-service`, ADR-0018) keeps non-identifying stats while clearing PII.

## 11. Controls → decisions → verification

| Control                           | ADR / code                | Verified by                        |
| --------------------------------- | ------------------------- | ---------------------------------- |
| Cookie sessions, scrypt passwords | FR-01, `auth-service`     | acceptance (supertest) tests       |
| RBAC + last-admin invariant       | 0004, `role-authorizer`   | acceptance + members-service tests |
| Plan gating at one seam           | 0021, `makeRequirePlan`   | require-plan tests                 |
| Tenant data isolation             | 0033/0034, `current-user` | acceptance tests per scope         |
| Non-escalatable super-admin       | 0037, `SUPER_ADMIN_EMAIL` | auth/tenant-admin tests            |
| Suspension enforced in auth       | 0038, `auth-service`      | auth-service tests                 |
| Encrypted API keys at rest        | FR-31, `secret-cipher`    | secret-cipher unit tests           |
| Production readiness gate         | 0029, `config` boot check | readiness-gate tests               |
| CORS allow-list + headers + CSP   | NFR-06, `security.ts`     | security middleware tests          |
| Auth rate limiting                | `create-app` limiter      | acceptance test (429)              |
| RFC-9457 errors                   | NFR-02, `problem.ts`      | acceptance tests                   |
| Static analysis                   | NFR-06                    | CodeQL + security workflow (CI)    |

## 12. Known gaps (tracked, not hidden)

- **No CSRF token** — acceptable under `SameSite=Lax` + same-origin CORS today;
  required before any `SameSite=None` deployment (§9).
- **No secret rotation runbook** — `APP_SECRET` rotation would need a re-encrypt
  pass over stored keys; the ciphertext is versioned (`v1:`) to make this
  tractable, but the procedure is not yet written.
- **In-controller role checks** — the authz asymmetry in §3 is a cleanliness gap,
  not a hole.
- **Web coverage is not gated** — the server has a 90 % Jest gate; the frontend
  suite is not yet a merge gate.
- **No third-party penetration test** — the posture above is internal review +
  CodeQL, not an external audit.
