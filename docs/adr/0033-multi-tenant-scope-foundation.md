# ADR-0033 — Multi-tenant scope foundation

- **Status:** Accepted (D-series, slice 6, step 1 of N)
- **Relates to:** ADR-0010 (shared team scope), ADR-0029/0030/0031/0032 (production readiness + horizontal scale)

## Context

Shared recruiting data (mandates, talents, pipeline, placements, suggestions,
audit trail, …) is owned by a **scope string** rather than an individual user —
`currentScope(req)`. Since ADR-0010 that scope has been the constant
`TEAM_SCOPE = 'team'`: one implicit tenant per deployment. Every write stamps
`owner_id = currentScope(req)` and every read filters on it, so the seam that a
real multi-tenant system needs is already threaded through the whole codebase —
it is just pinned to a single value.

To host more than one recruiting desk on one deployment (a natural next step now
that the app tier is horizontally scalable), that scope has to become a real
per-user attribute instead of a constant. Doing the whole thing at once (tenant
onboarding, member assignment, tenant-admin UI, billing per tenant) is a large
change; this ADR is the **behaviour-neutral foundation** it builds on.

## Decision

Make scope resolution **tenant-aware, defaulting to the historical single
tenant** — no behaviour change for any current deployment:

- `User` (and its public `UserView`) gain an optional `tenantId`. **Absent means
  `DEFAULT_TENANT = 'team'`** — exactly today's `TEAM_SCOPE`, so every existing
  user (none of whom carry a `tenantId`) keeps the same scope.
- `requireAuth` / `attachUser` stamp `req.tenantId = user.tenantId ?? DEFAULT_TENANT`
  alongside `userId`/`roles`.
- `currentScope(req)` returns `req.tenantId ?? DEFAULT_TENANT` instead of the
  constant. `TEAM_SCOPE` stays as an alias of `DEFAULT_TENANT` for the existing
  call sites and tests.
- Persistence carries the field end to end: a nullable `tenant_id` column on
  `users` (added idempotently in `migrate()` and in the Drizzle schema) with the
  round-trip in the user mappers. A `NULL` column reads back as an absent
  `tenantId`, i.e. the default tenant.

No route, query, or ownership rule changes. The scope value is identical
(`'team'`) for every user until someone is explicitly given a `tenantId`.

## Consequences

- The scope seam is now genuinely multi-tenant: assigning a user a `tenantId`
  isolates all their shared data from other tenants automatically, because every
  owner-scoped query already keys on `currentScope`. Nothing downstream needs to
  know tenants exist.
- Because absent `tenantId` collapses to `'team'`, the change is provably
  behaviour-neutral for current deployments — verified by the existing
  owner-scoped suites (all green) plus new unit tests: `currentScope` falls back
  to `DEFAULT_TENANT` without a tenant and echoes it with one, and the user
  mapper round-trips `tenantId`.
- This is **step 1 of N**. It deliberately does _not_ include: how a user gets a
  `tenantId` (onboarding / invite flow), a tenant registry, tenant-scoped admin,
  or cross-tenant super-admin. Those are follow-up slices that now have a stable
  seam to build on. Until then the app remains effectively single-tenant, which
  is the correct default for every current install.
