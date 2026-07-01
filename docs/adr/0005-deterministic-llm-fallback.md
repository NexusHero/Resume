# ADR-0005 — Deterministic fallback + per-user keys + metering for all AI

- **Status:** Accepted
- **Requirements:** FR-30, FR-31, NFR-05, NFR-08

## Context

AI is the differentiator, but LLMs are optional (no key), fallible (bad/no JSON),
metered (cost) and non-deterministic. The product must stay usable, honest and
affordable regardless.

## Decision

Every AI feature follows one service pattern (`DocumentAiService`):

1. **Resolve a provider per user** from their own encrypted key; if none is available,
   skip the LLM entirely.
2. **Deterministic template fallback** — a real, useful result is produced without any
   LLM, and is also the fallback when the LLM errors or returns unparseable output
   (`extractJson()` + zod `safeParse`).
3. **Never block on the LLM** for correctness; the template path is the contract.
4. **Meter every call** (`meter(userId, providerId, feature, usage)`) so requests /
   tokens / cost are attributable per user and feature.

## Consequences

- The suite works with no keys at all; keys only _improve_ output.
- Costs are visible and attributable; keys are encrypted at rest (`secret-cipher`).
- Each feature's tests must cover both the LLM-success and the fallback path.
