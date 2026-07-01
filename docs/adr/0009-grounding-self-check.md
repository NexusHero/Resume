# ADR-0009 — Grounding self-check over generated text

- **Status:** Accepted
- **Requirements:** FR-38, NFR-05
- **Relates to:** ADR-0005, ADR-0007

## Context

AI-drafted pitches and outreach are client-facing. A fabricated skill or an inflated "12
Jahre Erfahrung" reaching a client is a trust failure — the single worst outcome for a
product whose pitch is honesty. We need to catch unsupported claims before they are sent,
without a second LLM call in the loop.

## Decision

Add a deterministic verifier (`domain/grounding.ts`) that checks the generated text
against a **source** built from the candidate's CV + the mandate/ad. It is
**high-precision by design** — it flags only two high-signal claim kinds:

- **numbers with a unit** (years / %) whose value does not appear in the source;
- **known skill tokens** (from the ontology, ADR-0007) that the source does not evidence.

It deliberately does **not** do generic entity-matching: in German every noun is
capitalised, so that would be pure noise. The result (`GroundingReport`) is attached to
pitch/outreach output and surfaced in the Editor UI as a "nicht belegte Angaben" warning.

## Consequences

- Warns rather than cries wolf — recruiters keep trusting the signal.
- Runs offline, deterministically, on every generation; no extra LLM cost or latency.
- Coverage is intentionally narrow (numbers + known skills); prose claims are out of
  scope. Widening it means more ontology/units, weighed against false-positive risk.
