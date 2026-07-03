# Architecture Decision Records

Significant, hard-to-reverse decisions, captured so the _why_ survives the people who
made it. Format is a lightweight [MADR](https://adr.github.io/madr/): **Context →
Decision → Consequences**, plus a status. Numbering is sequential and immutable; a
decision that replaces another **supersedes** it rather than editing history.

These were written retroactively to document choices already made; new decisions get an
ADR at the time they are taken. ADRs reference [`../requirements.md`](../requirements.md)
where a decision satisfies a specific requirement.

| ADR                                                | Decision                                                       | Status   |
| -------------------------------------------------- | -------------------------------------------------------------- | -------- |
| [0001](0001-hexagonal-typescript-backend.md)       | Hexagonal TypeScript backend (ports & adapters, SOLID)         | Accepted |
| [0002](0002-awilix-di-composition-root.md)         | Awilix DI with a single composition root                       | Accepted |
| [0003](0003-file-store-default-postgres-opt-in.md) | File-backed store by default, Postgres via `STORE=sql`         | Accepted |
| [0004](0004-authenticated-team-scoped-api.md)      | Authenticated, team-scoped, RBAC API (supersedes the open API) | Accepted |
| [0005](0005-deterministic-llm-fallback.md)         | Deterministic fallback + per-user keys + metering for all AI   | Accepted |
| [0006](0006-first-party-data-no-scraping.md)       | First-party observation flywheel; no scraping of review sites  | Accepted |
| [0007](0007-offline-semantic-skill-matching.md)    | Offline semantic skill matching (ontology + trigram fuzzy)     | Accepted |
| [0008](0008-skill-canonicalization-taxonomy.md)    | Skill canonicalization taxonomy                                | Accepted |
| [0009](0009-grounding-self-check.md)               | Grounding self-check over generated text                       | Accepted |
| [0010](0010-team-scope-for-recruiting-data.md)     | Team scope as the ownership boundary for recruiting data       | Accepted |
| [0011](0011-per-user-llm-provider-choice.md)       | Per-user, persisted LLM provider choice                        | Accepted |
| [0012](0012-self-hosted-swagger-ui.md)             | Hand-maintained OpenAPI contract + self-hosted Swagger UI      | Accepted |
| [0013](0013-in-process-assistant-agent.md)         | In-process assistant agent with staged-suggestion autonomy     | Accepted |
