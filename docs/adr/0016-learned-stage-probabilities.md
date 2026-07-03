# ADR-0016 — Forecast v2: stage probabilities learned from the desk's own pipeline

- **Status:** Accepted
- **Relates to:** ADR-0006, ADR-0013, ADR-0014

## Context

The revenue forecast (Reports) weights every open candidacy with a
stage-based win probability. In v1 that curve was a fixed, industry-typical
constant — transparent, but the same for every desk. A boutique that places
one of two offers and a volume desk that places one of ten got the same
number. Meanwhile the pipeline board already produces the ground truth every
day: cards move through stages and eventually resolve. That signal was
simply thrown away.

## Decision

Keep the pipeline history and let the forecast learn from it — cautiously
and out loud:

- **A stage-transition log** (`StageTransition`, fs + sql): every pipeline
  move — including the initial add (`from: null`) — is recorded by
  `CandidacyService`. Logging is fire-and-forget: a failure warns and never
  breaks the pipeline action (same contract as usage metering and the
  outcome loop).
- **Learning is per stage and per desk** (`domain/stage-history`, pure): of
  the _resolved_ candidacies (reached `placed` or `rejected`) that passed
  through a stage, the share that placed is that stage's observed win
  probability. Open candidacies never count.
- **Thin data never moves the number:** below `MIN_SAMPLE` (5) resolved
  journeys a stage keeps the industry default. The response declares every
  stage's `source` (`observed` | `default`), `sample` and `wins` — the UI
  shows the provenance instead of pretending precision.
- **Interview intelligence** falls out of the same log: per client,
  interview→placement conversion (min. 3 resolved interviews), surfaced on
  the forecast card — where interviews win and where they stall.
- No ML, no external service: counting and division, deterministic and
  reproducible offline — consistent with ADR-0006/0007.

## Consequences

- The forecast gets truer every week the desk works — first-party data as
  the moat, the same flywheel as the outcome loop (ADR-0014).
- The learned curve is a long-run average; it lags regime changes (new
  market, new client mix). The declared `source`/`sample` keeps that
  honest, and the default curve remains the documented floor.
- One more store; rows carry only ids, stages and timestamps — no free
  text, DSGVO-neutral (talent ids follow the talent's lifecycle like the
  artifact log).
- Stage moves made before this version existed are unrecorded; the curve
  starts learning from deployment, not retroactively.
