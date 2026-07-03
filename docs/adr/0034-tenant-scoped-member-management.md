# ADR-0034 — Tenant-scoped member management

- **Status:** Accepted (D-series, slice 6, step 2 of N)
- **Relates to:** ADR-0033 (multi-tenant scope foundation), ADR-0010 (shared team scope), ADR-0004 (RBAC)

## Context

ADR-0033 made scope resolution tenant-aware: `currentScope(req)` returns the
acting user's `tenantId`, defaulting to `DEFAULT_TENANT = 'team'`. All
_owner-scoped_ data (mandates, talents, pipeline, …) already keys on that scope,
so those become tenant-isolated for free.

Member management was the exception. `MembersService.list()` returned **every**
account on the instance and `setRoles()` could target **any** account — the
member roster was still instance-global. In a multi-tenant deployment that would
let one tenant's admin see and re-role another tenant's users, and the
"a team must keep at least one admin" invariant was counted instance-wide rather
than per tenant.

## Decision

Scope member management to the acting admin's tenant:

- `MembersService.list(scope)` returns only members whose tenant equals `scope`.
- `MembersService.setRoles(targetId, roles, scope)` treats a target outside
  `scope` as **not found** — an admin can neither see nor mutate another tenant's
  accounts (no information leak: same 404 as a truly missing id).
- The last-admin guard counts admins **within `scope`** only, so each tenant
  independently keeps at least one admin.
- `MembersController` passes `currentScope(req)` into both. The HTTP contract
  (routes, request/response shapes) is unchanged — only the result set narrows.
- `scope` defaults to `DEFAULT_TENANT`, so a single-tenant install (every user
  without an explicit `tenantId`) behaves exactly as before.

A `tenantOf(user) = user.tenantId ?? DEFAULT_TENANT` helper centralises the
"absent means default" rule shared with ADR-0033.

## Consequences

- The member roster and role administration are now genuinely tenant-isolated,
  matching every other owner-scoped resource. Assigning a user a `tenantId`
  (still a future onboarding slice) now fully partitions them: their data _and_
  their visibility in the members list.
- Behaviour-neutral for current deployments — verified by the existing
  members suite (unchanged, still green) plus new tests: list filters by tenant,
  the default scope returns tenant-less users, a cross-tenant `setRoles` 404s
  without mutating, and the last-admin guard is per tenant (demoting acme's only
  admin fails even while globex still has one).
- Still **not** in scope (later slices): how a user acquires a `tenantId`
  (onboarding / invite), a tenant registry, and a cross-tenant super-admin who
  _should_ see everything. Until an invite flow exists the roster is one tenant
  (`team`), so this is a correctness guarantee waiting to be exercised rather
  than a visible feature change.
