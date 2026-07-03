# ADR-0022 — Split the DocumentAiService god class behind a shared runner

- **Status:** Accepted
- **Relates to:** ADR-0001 (hexagonal, SOLID), ADR-0002 (DI), ADR-0005 (per-user keys + metering), ADR-0019 (ApplicationBuilder extraction — a prior split of the same kind)

## Context

`DocumentAiService` had grown into the backend's one god class: ~790 lines,
eleven constructor dependencies, and ten unrelated AI features under one roof —
document assist, CV/PDF parsing, ATS scoring, pitch, outreach, cover letters,
translation, match explanation, interview kit and candidate prep. Each feature
followed the same shape (resolve the user's provider, build a prompt, generate
with a token budget, meter usage, parse the reply, optionally ground it), but
that shared shape lived as private methods tangled together with ten feature
bodies. The architecture review had flagged it as the last real
Separation-of-Concerns debt (see architecture.md §11); it was the one file where
"what changes together, lives together" no longer held.

## Decision

- **Extract the shared shape into one `LlmFeatureRunner`.** The provider
  resolution, generate-and-meter, reply parsing and grounding idioms — the six
  private helpers every feature reused — become a single injected collaborator
  with its own leaf dependencies (`llmService`, `apiKeyStore`, `userRepository`,
  `usageMeter`, `clock`, `logger`). The per-feature token budgets stay in one
  `MAX_TOKENS` map next to it.
- **Split the ten features into five single-concern services** grouped by what
  they actually share (data, not just the runner): `DocumentAssistService`
  (suggest / tailor / translate), `CvParseService` (parse / parsePdf),
  `AtsAiService` (scoreAgainstJob), `OutreachAiService` (pitch / outreach), and
  `MatchAiService` (explainMatch / interviewKit / candidatePrep). Each takes the
  runner plus only the extra ports its own feature needs (e.g. only
  `OutreachAiService` sees the `artifactLogRepository`), so no service carries a
  dependency it does not use.
- **Keep `DocumentAiService` as a thin, logic-free facade** that holds the five
  services and delegates every one of its eleven methods
  (`return this.assist.suggest(...a)`), typed via
  `Parameters<Service['method']>` so signatures can never drift from the real
  implementation. It re-exports the result types from their new homes so every
  caller's import path is unchanged.

## Consequences

- **Behaviour-neutral by construction.** Callers, routes, the container cradle
  name (`documentAiService`) and the ~70 existing test call-sites are untouched;
  the full suite (1003 tests, ≥ 90 % branch gate) is the safety net and stays
  green. The six new classes are registered as singletons in the composition
  root ahead of the facade (ADR-0002); a `buildDocumentAiService` test helper
  assembles the facade from the same eleven leaf deps the single service used to
  take, so unit tests keep one construction call.
- The largest file drops from ~790 lines to a ~75-line facade; each feature
  service is small enough to read whole, and the shared LLM idiom now has exactly
  one home instead of being copy-adjacent inside a god class.
- **The facade is a migration aid, not the destination.** Callers may depend on
  the specific service directly; once they do, the facade can be retired. Until
  then it costs nothing but delegation.
- Mirrors the ADR-0019 move (pulling `ApplicationBuilder` out of the assistant):
  same pattern — a shared runner plus concern-sized services behind a stable
  entry point — applied to the other god class the review named.
