# ADR-0007 — Offline semantic skill matching (ontology + trigram fuzzy)

- **Status:** Accepted
- **Requirements:** FR-32, FR-33, NFR-08

## Context

Pure keyword overlap misses that "React" and "Vue" are both frontend, or that "Postgres"
answers a "SQL" requirement, and it trips on spelling variants ("NodeJS" vs "Node.js").
An LLM could bridge these, but matching runs often and must be cheap, reproducible and
explainable.

## Decision

Add a deterministic semantic layer (`domain/skill-semantics.ts`) on top of exact
matching, with **no model and no network**:

1. a curated **skill ontology** — tokens in the same cluster count as related;
2. **trigram Dice similarity** — catches spelling/format variants;
3. bounded substring matching for reasonably long tokens.

`skillMatchesJob` combines these; `jobClusters` precomputes a job's clusters once.

## Consequences

- Matching is transparent and reproducible — the same inputs always score the same, and a
  human can see _why_ a skill matched.
- The ontology is hand-maintained; new domains need a cluster entry. Accepted as the cost
  of determinism.
- Feeds explainable match (FR-33) and grounding's skill check (ADR-0009).
