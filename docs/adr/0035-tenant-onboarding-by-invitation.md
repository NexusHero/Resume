# ADR-0035 — Tenant onboarding by invitation

- **Status:** Accepted (D-series, slice 6, step 3 of N)
- **Relates to:** ADR-0033 (multi-tenant scope foundation), ADR-0034 (tenant-scoped member management), ADR-0004 (auth/RBAC)

## Context

ADR-0033/0034 made the whole app tenant-aware: data and member management are
partitioned by `currentScope(req)`, which resolves to the user's `tenantId`
(default `'team'`). But the seam that _assigns_ a `tenantId` was deliberately
left open — a fresh sign-up always bootstrapped the default single tenant, so in
practice every install stayed single-tenant. To grow a tenant's team you need a
way for an existing admin to bring in new members bound to that tenant.

Two shapes were considered: **self-serve** (register with a tenant slug) and
**admin-invite** (an existing admin invites an email). Admin-invite was chosen:
it gives the cleanest isolation (no one joins a tenant without an admin's
action), needs no public tenant registry, and matches how B2B workspaces
onboard. New-tenant _creation_ (a super-admin or self-serve tenant registry) is
a separate, later concern — this slice only handles joining an **existing**
tenant.

## Decision

Add an invitation round-trip, leaving the existing `register` flow untouched:

- **Domain** `TenantInvite` (token, email, tenantId, roles, invitedBy, createdAt)
  with a public `TenantInviteView` that never carries the token. An
  `InviteRepository` port with fs, sql, and in-memory adapters (a `tenant_invites`
  table + idempotent migration on the SQL side).
- **Admin creates** — `POST /members/invites` (admin-only via the existing
  `member` authorizer, new `invite`/`listInvites` actions): mints a single-use
  token bound to the admin's own `currentScope`, emails the accept link
  (best-effort; the URL is also returned so a console/offline deployment can
  share it), and rejects if the email is already registered.
  `GET /members/invites` lists the tenant's pending invitations (no tokens).
- **Invitee accepts** — `POST /auth/accept-invite` (public, rate-limited like
  the other auth routes): validates + consumes the token (single-use, TTL from
  `INVITE_TTL_DAYS`, default 7), creates the account **bound to the invite's
  tenant and roles**, and opens a session — mirroring how registration sets the
  cookie. Acceptance lives in a dedicated `InviteService`, so `AuthService.register`
  is byte-for-byte unchanged.

## Consequences

- A user can now acquire a non-default `tenantId`: an invited account lands in
  the inviting tenant, and — because ADR-0033/0034 already key everything on
  scope — is automatically isolated to that tenant's data and member roster with
  no further work.
- Behaviour-neutral for current installs: nothing issues invites yet from the
  UI (a follow-up slice), and `register` is unchanged, so a fresh instance still
  bootstraps the single `'team'` tenant exactly as before. Verified by the
  untouched auth suites plus new unit tests (create/list/accept, dedup, TTL
  expiry, cross-registration conflict) and an HTTP round-trip acceptance test
  (admin invites → invitee accepts → joins the tenant; non-admin is 403;
  unknown token is 401).
- The **UI** landed in a follow-up slice: the login screen gains an
  `?invite_token=` accept mode (set a password → join), and Settings gains an
  admin "Invite a colleague" card (email + roles, showing the accept link for
  offline sharing) plus a pending-invite list.
- Still out of scope (later slices): revoking a pending invite, and **new-tenant**
  creation / a cross-tenant super-admin.
