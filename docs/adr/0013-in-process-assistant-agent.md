# ADR-0013 — In-process assistant agent with staged-suggestion autonomy

- **Status:** Accepted — extended by ADR-0019
- **Relates to:** ADR-0001, ADR-0004, ADR-0005, ADR-0010
- **Extended by:** ADR-0019 (adds a third `autopilot` gear that _does_ spend LLM
  tokens; the "two modes, token-free in every mode" decision below is the v1
  scope this ADR froze, not the current ceiling)

## Context

The suite's AI features are request-driven: the recruiter clicks each helper.
The next step is an agent that prepares the desk proactively — shortlists for
active mandates, stalled-pipeline nudges, data-gap flags — and keeps working
while nobody is signed in. Two questions had to be settled: **where does the
agent run** (an external client of the REST API vs. inside the server) and
**how much may it do alone**.

## Decision

- **A second driver of the application layer.** The agent runs in-process: a
  minute-tick scheduler (started in `index.ts`, `unref`ed) asks
  `AssistantService.runIfDue(TEAM_SCOPE)`; the service calls the same
  application services the HTTP controllers call (`MatchService`,
  `CandidacyService`, …). Capability-wise it can do exactly what the API can —
  but without a synthetic service account, with the same invariants, and fully
  unit-testable. Hexagonally it is simply another driving adapter.
- **Staged suggestions as the contract.** Every finding becomes an
  `AssistantSuggestion` (title, rationale, payload, status) in a persisted,
  team-scoped queue the recruiter accepts or dismisses — the same
  staged-change pattern as the editor's AI banner. Dismissed suggestions are
  never re-proposed (dedup per kind+mandate+talent); the assistant must not nag.
- **Two autonomy modes, hard limits in both.** `suggest` (default) stages
  everything; `act` lets the agent apply _internal, reversible_ actions itself
  (add a match to the pipeline), visibly marked `auto-applied`. In no mode does
  it contact anyone, delete anything, or spend LLM tokens (the v1 playbook is
  fully deterministic). _(ADR-0019 later adds a third gear, `autopilot`, which
  builds application packets and does spend tokens — still nothing outward-facing
  or destructive, and the two modes here stay token-free.)_
- **Settings are persisted** (fs/sql, per team scope) — enabled, mode,
  interval, lastRunAt — so the agent's behaviour survives restarts and runs
  while everyone is signed out.

## Consequences

- No new process/queue infrastructure; the deploy story is unchanged. The
  trade-off: runs share the Node event loop — acceptable for a deterministic
  playbook over team-sized data, revisit if runs ever get heavy.
- The review queue is the natural anchor for later features (LLM-drafted
  outreach with per-run token budgets, outcome tracking on accepted
  suggestions).
- Multi-instance deploys would run the scheduler per instance; the dedup key
  makes that idempotent, a proper leader election is deferred until it matters.
