# ADR-0006 — First-party observation flywheel; no scraping of review sites

- **Status:** Accepted
- **Requirements:** FR-36, FR-39, FR-61, NFR-07

## Context

Prep quality depends on knowing what a given employer's interviews are actually like.
The obvious source — scraping Kununu/Glassdoor — was investigated and rejected: no public
API, terms-of-service and GDPR exposure, and it contradicts the trust/DSGVO positioning
that is itself the moat.

## Decision

Build company knowledge from **legal, first-party sources** instead:

- a curated **company archetype** catalogue as a cold-start baseline;
- **interview observations** captured by recruiters after each real interview
  (`interview-observation-service`), which **override the archetype** as evidence
  accrues.

Prep (FR-36) reads observed data first, archetype second. AI applies _our_ curated /
observed data rather than inventing employer facts.

## Consequences

- Company confidence grows with usage — a first-party data moat that improves the more
  the desk is used, with no third-party legal risk.
- Cold start is weaker than scraped data would be; the archetype baseline mitigates it
  and observations close the gap over time.
- Reinforces the anti-hallucination stance (ADR-0009): concrete claims are grounded in
  data we own.
