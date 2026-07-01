# ADR-0010 — Team scope as the ownership boundary for recruiting data

- **Status:** Accepted
- **Requirements:** FR-03, FR-04
- **Relates to:** ADR-0004

## Context

Recruiting is a team sport: a mandate one colleague takes, another may source for; the
talent pool, placements and interview observations are shared assets. Scoping this data
per individual user would fragment the desk and break collaboration.

## Decision

Introduce a **team scope** as the ownership boundary for recruiting data. `currentScope(req)`
resolves to the team; mandates, talents, candidacies, placements and observations are owned
by the team, not the individual. Personal-toolkit data (a user's own applications) stays
user-owned. RBAC (ADR-0004) governs who may administer the team.

## Consequences

- All team members see and act on the same recruiting data — the natural model for an
  agency desk.
- Access control shifts from "is this my row?" to "is this row in my team's scope?"; every
  recruiting service must resolve and enforce the team scope, not the raw user id.
- DSGVO paths (export/erasure/retention) operate against the correct scope — personal data
  for the individual, pool data under team retention (FR-60, FR-61).
