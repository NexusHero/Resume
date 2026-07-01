# ADR-0004 — Authenticated, team-scoped, RBAC API

- **Status:** Accepted — **supersedes** the earlier "keep the API unauthenticated" decision
- **Requirements:** FR-01, FR-02, FR-03, FR-04, NFR-06

## Context

The original tool served a single trusted owner, so the API was intentionally
unauthenticated. Turning it into a recruiting product for teams handling third-party
personal data made that untenable — data isolation and access control became mandatory.

## Decision

- **Authentication:** email + password; opaque, httpOnly, server-side-expiring session
  cookies with `Secure`; scrypt-hashed passwords; rate-limited credential endpoints;
  password reset via one-time token.
- **Authorisation:** role-based (`role-authorizer`); admin-only operations (member/role
  management) refuse non-admins with problem+json.
- **Scope:** recruiting data is **team-scoped** (see ADR-0010), not per-user.
- Unauthenticated errors stay RFC-9457 problem+json (`401`).

## Consequences

- All recruiting endpoints require a session; job search and cover-letter generation stay
  open.
- The trust story (NFR-06) is now defensible for a product handling candidate data.
- More moving parts (sessions, hashing, RBAC) — accepted as the cost of multi-tenancy.
