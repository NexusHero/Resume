# ADR-0014 — First-party outcome loop over AI artifacts

- **Status:** Accepted
- **Relates to:** ADR-0005, ADR-0006, ADR-0013

## Context

Generating pitches and outreach is a commodity — any LLM wrapper does it. What
no model provider can offer is knowing **which drafts actually work for this
desk**: which channel gets replies, whether AI drafts outperform the
deterministic templates, which tone converts. That knowledge only exists if
generation and result are connected. Until now the result was never captured.

## Decision

Log every client-facing artifact (outreach message, candidate pitch) at
generation time — including template results, because the template-vs-AI
comparison is the point — and let the recruiter stamp its fate later:
`replied`, `no-reply`, `converted`.

- **The log is first-party and team-scoped** (`ArtifactLog`, fs + sql): kind,
  talent, provider, channel/audience, outcome, timestamps. No message bodies
  are stored — the fate matters, the text is reproducible and the log stays
  lean and privacy-friendly.
- **Logging never breaks the feature it observes** (same contract as usage
  metering): failures are logged and swallowed.
- **Honest aggregates:** `replyRate` counts only resolved artifacts and is
  `null` — not 0 — while nothing is resolved. Surfaced where decisions happen:
  the outreach modal (this talent's history + the desk's rate) and a Reports
  card (by kind and by provider).
- Outcome capture is manual in v1; the planned email integration turns
  reply detection into an automatic signal, and the assistant (ADR-0013) is
  the natural consumer for "which draft style should I propose".

## Consequences

- Every week of use grows a dataset that makes the product better and a
  switch away more expensive — the moat is the loop, not the model.
- Manual stamping is friction; acceptable at desk scale and removed by the
  email integration. Unstamped artifacts stay `pending` and never distort the
  rate.
- One more store; the DSGVO surface grows slightly (talent-linked rows) —
  they carry no free text and follow the talent's lifecycle.
