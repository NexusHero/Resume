# ADR-0038 — Cross-tenant management and suspension

- **Status:** Accepted (D-series, slice 6, step 4·3 of N)
- **Relates to:** ADR-0037 (super-admin + registry read), ADR-0036/0034/0033 (tenants, members, scope)

## Context

ADR-0037 gave the super-admin a read across tenants. The chosen model
("voll verwalten") also calls for **management**: acting on any tenant's members
and taking a tenant offline. Two capabilities were missing:

1. **Cross-tenant member management** — list and re-role members of a tenant the
   super-admin is not a member of.
2. **Suspension** — mark a tenant offline and actually enforce it, not just flip
   a flag.

## Decision

All under the existing super-admin-gated `/admin` console:

- **`GET /admin/tenants/:id/members`** and
  **`PATCH /admin/tenants/:id/members/:userId/roles`** delegate straight to the
  already tenant-scoped `MembersService` (ADR-0034) with the path tenant as the
  scope. So the per-tenant last-admin guard and the "target must be in this
  tenant" rule apply cross-tenant for free.
- **`PATCH /admin/tenants/:id`** with `{ status }` suspends/reactivates a tenant
  via `TenantService.setStatus` (404 for the implicit default team, which has no
  record and cannot be suspended).
- **Enforcement lives in `AuthService`**, the one choke point: `login` throws and
  `currentUser` returns `null` when the acting user's tenant is suspended — so a
  suspension **kills existing sessions**, not just new logins. Users without an
  explicit tenant (the default team) skip the check entirely, so the common
  single-tenant path pays nothing and can never be suspended.

## Consequences

- The super-admin can now fully operate the platform: inspect and fix any
  tenant's roles, and take a tenant offline with immediate effect.
- Enforcement is centralised and cheap: one lookup, only for users who actually
  belong to a registered tenant. Verified by unit tests (login rejects, session
  dies then returns on reactivation, default-team users are never suspended;
  `setStatus` suspend/reactivate/no-op/404) and acceptance (super-admin lists +
  re-roles another tenant's member; suspends → the member's session dies and
  login is 401 until reactivated; unknown tenant 404; a non-super-admin is 403).
- **Behaviour-neutral by default**: no `SUPER_ADMIN_EMAIL` → the whole `/admin`
  surface is 403; `SELF_SERVE_TENANTS` off → no user has a registered tenant, so
  suspension enforcement never triggers.
- The super-admin **UI** landed in a follow-up commit: a "Platform — all
  workspaces" card in Settings, shown only when `/auth/me` reports
  `isSuperAdmin`. It lists every tenant (name · member count · status) with a
  suspend/reactivate toggle (the default team's is disabled) and expands a tenant
  to re-role its members.
- Still out of scope: deleting a tenant (suspension is reversible and safer;
  hard delete is a DSGVO exercise on its own).
