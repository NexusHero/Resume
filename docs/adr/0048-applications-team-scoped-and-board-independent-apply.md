# ADR-0048 — Applications are team-scoped, DSGVO-complete, and appliable without a job board

- **Status:** Accepted
- **Requirements:** FR-15, FR-16, FR-17 (DSGVO export), NFR-05
- **Supersedes part of:** ADR-0046 (which left applications instance-wide)

## Context

ADR-0046 wired the applications resource into the workspace but left two
production gaps that a first real customer test surfaced:

1. **Applications were instance-wide, not team-scoped.** `ApplicationController`
   read `service.list()` with no owner filter, so every authenticated user saw
   **every team's** applications — a cross-tenant data leak, and applications
   were also missing from the DSGVO account export.
2. **A candidate could only be applied from a live job-board posting.** The only
   "Apply" entry point hung off a posting card, so when the board was unreachable
   (or simply had no hit) there was **no way to apply a candidate at all** — even
   though the recruiter usually already knows the role (it is their own mandate).

## Decision

- **Scope applications by owning team** (ADR-0010/0033), exactly like mandates,
  talents and placements: `Application` gains an `ownerId`; every repository read
  is filtered by it (fs + Postgres, with an additive `owner_id` migration
  backfilled to the default team); the controller passes `currentScope(req)`; and
  the audit `/history` is filtered to the caller's own applications.
- **Include applications in the owner-scoped account export** so the DSGVO export
  is complete. (Erasure is unchanged: applications are team-shared data, like
  placements, so deleting one member's account does not delete the team's records.)
- **Make apply board-independent.** Matching's Manual mode gains an
  "Apply {candidate} to a role" panel: type a company + role directly, or prefill
  them from one of the recruiter's own mandates, then apply. The live-posting
  cards keep their per-posting Apply.

## Consequences

- No cross-tenant leakage; applications behave like the rest of the recruiting
  data and are fully covered by export.
- The core "apply on a candidate's behalf" workflow works offline and when the
  job board is down — it no longer depends on an external source being reachable.
- `owner_id` is backfilled to `'team'` for any pre-existing rows, matching the
  single-tenant default; multi-tenant installs isolate cleanly from then on.
