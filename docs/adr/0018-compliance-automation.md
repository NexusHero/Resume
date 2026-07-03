# ADR-0018 — Compliance automation: audit trail, Löschfristen-Automatik, AGG writing aid

- **Status:** Accepted
- **Relates to:** ADR-0005, ADR-0010, ADR-0013, ADR-0014

## Context

The product already had the compliance primitives — a per-user AI usage
meter, a manual retention report with an anonymize action, and a rule-based
AGG language check — but each stopped one step short of the work it implies.
Usage was only ever an aggregate, never an exportable record. Retention
surfaced stale candidates but left every deletion to a human, so overdue data
lingered. The AGG check flagged risky wording but the recruiter still had to
rewrite it by hand. This ADR closes those three gaps without adding a model
dependency or a destructive default.

## Decision

- **KI-Audit-Trail** (`domain/usage`): the same metered events yield a
  per-call record — model, feature, tokens, cost, timestamp — served as JSON
  and as a downloadable, Excel-safe CSV. It is the granular transparency
  DSGVO (Art. 15) and the EU AI Act expect, derived from data already kept;
  no new store, and it stays per user because keys and quota are per user.
- **Löschfristen-Automatik** (`domain/retention`, `RetentionPolicy`, fs+sql):
  a persisted policy adds a hard deletion deadline (Löschfrist) beside the
  soft review window; items past it are `overdue`. An admin can anonymize one,
  clear all overdue in bulk, or enable a background sweep that does it on a
  schedule. Automation is **opt-in and off by default**, and it only ever
  anonymizes — identifying fields and raw CVs are cleared, role/skills/pipeline
  history are kept — so it is never a hard, irreversible delete. The review
  window is clamped to at most the deletion deadline so the flag can't fire
  after the deadline it warns about.
- **AGG-Schreibhilfe** (`domain/agg-check`): the existing rule set gains a
  neutral `replacement` where one is safe, and `rewriteAgg` applies them
  deterministically, returning the rewritten text, the edits made, and the
  findings it could **not** safely fix (an age limit or a hard exclusion needs
  a human, not a mechanical swap). Rule-based and offline, like the check it
  extends — a drafting aid, not legal advice.

## Consequences

- The compliance surface is now actionable end to end: export the AI record,
  let overdue data clear itself, and turn a flagged ad into a neutral draft in
  one click.
- The auto-sweep holds real deletion power. It is gated three ways — admin
  only, opt-in, anonymize-not-delete — and logs every pass. Teams that want a
  human in the loop simply leave it off and keep the bulk/one-click actions.
- The audit trail is per user; a team-wide processing record across members is
  a later step (it needs cross-user aggregation the current usage port doesn't
  expose).
- The AGG writing aid is deliberately conservative: it under-rewrites rather
  than risk changing meaning, surfacing the hard cases instead of guessing.
