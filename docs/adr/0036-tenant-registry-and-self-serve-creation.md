# ADR-0036 — Tenant registry and self-serve creation

- **Status:** Accepted (D-series, slice 6, step 4·1 of N)
- **Relates to:** ADR-0033 (multi-tenant scope), ADR-0034 (tenant-scoped members), ADR-0035 (invitation onboarding), ADR-0004 (auth/RBAC)

## Context

So far a tenant was only a **string** stamped on a user (`tenantId`, ADR-0033),
acquired by invitation into an existing tenant (ADR-0035). Two things were still
missing to run as a real multi-tenant platform (the chosen "hybrid + full
super-admin" model):

1. **Tenants as records** — you cannot list, name, or suspend a bare string. A
   super-admin console needs a registry.
2. **A way to create a _new_ tenant** — invitation only grows an _existing_ one.

This ADR is the foundation slice: the registry plus **self-serve creation** on
registration. The super-admin role and cross-tenant management build on it in
following slices.

## Decision

- **`Tenant` record** (`id`, `name`, `createdAt`, `status: active | suspended`)
  behind a `TenantRepository` port with fs, sql (a `tenants` table + idempotent
  migration) and in-memory adapters. The implicit `DEFAULT_TENANT` (`'team'`) has
  no row unless one is created — existing single-tenant installs need no backfill.
- **Self-serve creation**, gated by `SELF_SERVE_TENANTS` (default **off**):
  - **On**: every `POST /auth/register` creates a **new** tenant and the
    registrant becomes its **admin** (`['admin','recruiter']`), bound via
    `tenantId`. An optional `workspaceName` names it; absent, a default is
    derived from the email (`"<local-part>'s workspace"`). Each signup is a
    fully isolated workspace — there is no shared "first user owns the team"
    bootstrap in this mode.
  - **Off** (the default): `register` is **unchanged** — the first account owns
    the single default team as admin, later ones join as recruiter, and no
    tenant rows are written.
- Invitation-based joins (ADR-0035) are unchanged and independent: an invitee
  still lands in the inviter's tenant regardless of this flag.

The self-serve wiring lives entirely in `AuthService.register`; the
`tenantRepository`/`config` deps are **optional**, so every existing construction
of the service (and the default install) keeps the old behaviour.

## Consequences

- Tenants are now first-class and enumerable — the prerequisite for the
  super-admin registry/console (next slices) and for suspending a workspace.
- **Behaviour-neutral by default**: with `SELF_SERVE_TENANTS` unset, nothing
  changes — verified by the untouched auth/acceptance suites plus new tests
  (self-serve on → own tenant + admin, provided vs derived name, each signup
  isolated; self-serve off → the single-team bootstrap and no tenant rows).
- Turning the flag **on is a deliberate product change**: signups stop sharing
  one workspace. It is intended for a public multi-tenant deployment, not an
  internal single-team one — hence off by default and documented as such.
- Still out of scope (next slices): the **super-admin** role
  (`SUPER_ADMIN_EMAIL` bootstrap), the cross-tenant **registry/console** (list
  tenants, manage any tenant's members, suspend), and its UI. This slice only
  creates and persists tenants; nothing reads the registry yet.
