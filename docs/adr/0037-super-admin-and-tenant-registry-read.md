# ADR-0037 — Super-admin capability and cross-tenant registry (read)

- **Status:** Accepted (D-series, slice 6, step 4·2 of N)
- **Relates to:** ADR-0036 (tenant registry + self-serve), ADR-0033/0034/0035 (tenant scope, members, invites), ADR-0004 (auth/RBAC)

## Context

ADR-0036 made tenants first-class records. The chosen model also calls for an
instance operator — a **super-admin** — who can see and (later) manage all
tenants. Two questions had to be answered safely:

1. **Who is a super-admin, and how is it granted?** It must not be grantable
   through the app: a tenant admin escalating themselves to cross-tenant access
   would be a critical hole. So it is **not** a team role.
2. **What is orthogonal vs. shared with tenant RBAC?** Super-admin is
   instance-level; tenant `admin`/`recruiter` roles stay tenant-scoped.

This slice adds the capability plus the first read: a cross-tenant registry list.

## Decision

- **Super-admin is a config-bootstrapped capability, not a role.** Emails in
  `SUPER_ADMIN_EMAIL` (comma-separated, set out-of-band) are super-admins. It is
  **not** in the `Role` enum, never appears in member management, and cannot be
  set through any endpoint — so it can't be escalated from inside a tenant.
- **Stamped at auth time.** `requireAuth` sets `req.isSuperAdmin` from the
  configured set; `currentIsSuperAdmin(req)` reads it. `/auth/me` returns
  `isSuperAdmin` so the UI can reveal the console (a later slice). The flag is
  independent of `currentScope` / tenant roles.
- **Super-admin console under `/admin`,** gated in the controller on
  `currentIsSuperAdmin` (a tenant admin gets 403). First route:
  `GET /admin/tenants` → every tenant with its **member count**, via a
  `TenantService` that reads the registry and joins user counts. The implicit
  `DEFAULT_TENANT` has no registry row, so it is **synthesised** whenever it
  still has members — the overview must show the pre-self-serve default team,
  not hide it.

Read-only in this slice: no cross-tenant mutation yet.

## Consequences

- There is now a safe, non-escalatable instance-operator identity and a
  cross-tenant read. `GET /admin/tenants` gives an honest census (registry
  tenants + the default team) with member counts.
- **Behaviour-neutral by default**: `SUPER_ADMIN_EMAIL` unset → nobody is a
  super-admin, `/admin/*` is 403 for everyone, and `/auth/me` reports
  `isSuperAdmin: false`. The only always-on change is the additive `isSuperAdmin`
  field on `/auth/me`. Verified by new tests: `TenantService.list` counts +
  default-team synthesis (present/empty/already-registered), and acceptance
  (super-admin lists tenants incl. the default team; a non-super-admin is 403;
  unauthenticated is 401).
- Still out of scope (next slices): cross-tenant **management** — changing any
  tenant's members/roles and **suspending** a tenant (D6·4·3) — and the
  super-admin **UI** (D6·4·4).
