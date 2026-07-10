# Architecture Decision Records

Significant, hard-to-reverse decisions, captured so the _why_ survives the people who
made it. Format is a lightweight [MADR](https://adr.github.io/madr/): **Context →
Decision → Consequences**, plus a status. Numbering is sequential and immutable; a
decision that replaces another **supersedes** it rather than editing history.

These were written retroactively to document choices already made; new decisions get an
ADR at the time they are taken. **This is a hard rule, not a suggestion:** a PR that
introduces or swaps a technology, or changes a cross-cutting architectural pattern, does
not merge without a new or updated ADR in the same PR — see
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#ways-of-working). ADRs reference
[`../requirements.md`](../requirements.md) where a decision satisfies a specific
requirement.

## Writing one

Copy the newest file as a starting point, take the next free number, and keep the
MADR shape: a short **Context** (the forces at play), the **Decision** in one or two
sentences, and **Consequences** (what this enables, what it costs, what it forecloses).
Add the row to the table below in number order.

| ADR                                                                  | Decision                                                                                                  | Status   |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| [0001](0001-hexagonal-typescript-backend.md)                         | Hexagonal TypeScript backend (ports & adapters, SOLID)                                                    | Accepted |
| [0002](0002-awilix-di-composition-root.md)                           | Awilix DI with a single composition root                                                                  | Accepted |
| [0003](0003-file-store-default-postgres-opt-in.md)                   | File-backed store by default, Postgres via `STORE=sql`                                                    | Accepted |
| [0004](0004-authenticated-team-scoped-api.md)                        | Authenticated, team-scoped, RBAC API (supersedes the open API)                                            | Accepted |
| [0005](0005-deterministic-llm-fallback.md)                           | Deterministic fallback + per-user keys + metering for all AI                                              | Accepted |
| [0006](0006-first-party-data-no-scraping.md)                         | First-party observation flywheel; no scraping of review sites                                             | Accepted |
| [0007](0007-offline-semantic-skill-matching.md)                      | Offline semantic skill matching (ontology + trigram fuzzy)                                                | Accepted |
| [0008](0008-skill-canonicalization-taxonomy.md)                      | Skill canonicalization taxonomy                                                                           | Accepted |
| [0009](0009-grounding-self-check.md)                                 | Grounding self-check over generated text                                                                  | Accepted |
| [0010](0010-team-scope-for-recruiting-data.md)                       | Team scope as the ownership boundary for recruiting data                                                  | Accepted |
| [0011](0011-per-user-llm-provider-choice.md)                         | Per-user, persisted LLM provider choice                                                                   | Accepted |
| [0012](0012-self-hosted-swagger-ui.md)                               | Hand-maintained OpenAPI contract + self-hosted Swagger UI                                                 | Accepted |
| [0013](0013-in-process-assistant-agent.md)                           | In-process assistant agent with staged-suggestion autonomy                                                | Accepted |
| [0014](0014-first-party-outcome-loop.md)                             | First-party outcome loop over AI artifacts                                                                | Accepted |
| [0015](0015-first-party-email-integration.md)                        | Email integration: send outreach + envelope-only reply sync                                               | Accepted |
| [0016](0016-learned-stage-probabilities.md)                          | Forecast v2: stage probabilities learned from the desk's data                                             | Accepted |
| [0017](0017-local-embeddings-hybrid-matching.md)                     | Matching v2: local embeddings behind a port, hybrid scoring                                               | Accepted |
| [0018](0018-compliance-automation.md)                                | Compliance automation: audit trail, Löschfristen, AGG rewrite                                             | Accepted |
| [0019](0019-autopilot-auto-apply-agent.md)                           | Autopilot: the auto-apply gear of the one agent                                                           | Accepted |
| [0044](0044-github-pages-api-docs-mirror.md)                         | Read-only Swagger UI mirror on GitHub Pages                                                               | Accepted |
| [0045](0045-no-fabricated-job-data-live-sources-only.md)             | No fabricated job data; live boards only (Arbeitnow default)                                              | Accepted |
| [0046](0046-applications-submission-pipeline.md)                     | Applications pipeline wired to the board; apply from Matching                                             | Accepted |
| [0047](0047-recruiting-actions-never-fail-silently.md)               | Recruiting UI actions never fail silently; validated inputs                                               | Accepted |
| [0048](0048-applications-team-scoped-and-board-independent-apply.md) | Applications team-scoped + DSGVO-exported + appliable without a board                                     | Accepted |
| [0049](0049-production-runtime-hardening.md)                         | Production runtime hardening: PDF browser, job resilience, AI rate limit                                  | Accepted |
| [0050](0050-generalized-job-source-registry.md)                      | Generalized job-source registry: all boards on, declarative descriptors, per-source counts                | Accepted |
| [0051](0051-nestjs-composition-and-http.md)                          | NestJS for composition + HTTP (supersedes Awilix ADR-0002); hexagonal core kept                           | Accepted |
| [0052](0052-single-source-document-rendering.md)                     | One render source for the editor preview and the PDF (WYSIWYG); preview is an iframe of the export HTML   | Accepted |
| [0053](0053-appearance-theming.md)                                   | Appearance (light/dark) as a `data-mode` token layer; system default + persisted choice; ink rail anchor  | Accepted |
| [0054](0054-mobile-touch-and-board-scroll.md)                        | Mobile finish: 44px touch targets, board snap-scroll, safe-area insets, 100dvh, mobile Playwright project | Accepted |
