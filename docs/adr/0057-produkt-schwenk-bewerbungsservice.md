# ADR-0057 — Produkt-Schwenk: Bewerbungsservice zuerst

- **Status:** Accepted
- **Relates to:** ADR-0005 (deterministic LLM fallback — partially superseded),
  ADR-0011 (per-user, persisted LLM provider choice — superseded),
  ADR-0013/0019 (CoRecruiter — frozen behind a workspace switch),
  ADR-0033/0036 (tenant/workspace scope), ADR-0046/0048 (applications — reworked by
  the new Bewerbung flow), ADR-0051 (NestJS composition + HTTP)

## Context

The product was built and shipped as a **recruiting suite for agencies**: client
mandates, a talent pool, a candidacy pipeline, placements, dashboards, and an
in-process CoRecruiter agent. The differentiator throughout was optional AI —
per-user API keys with a deterministic template fallback (ADR-0005/0011).

The owner has now decided the product's **main path is the application flow**, not
the agency/placement loop: a person ("Mandant") applies with their own CV and cover
letter; the software helps tailor both to a specific job and assemble the
Bewerbungsmappe. The existing agency features remain valuable but must no longer
compete for the primary flow. The forces that shape this decision:

1. **Focus.** Two products in one shell confuse every new user. The application
   flow must be the unmissable, dead-simple golden path; agency features are an
   opt-in second mode, not the front door.
2. **Honesty about AI.** The deterministic template fallback (ADR-0005) silently
   presented template text as if it were AI output. For a person tailoring their
   own CV, fabricated or template "AI" text is worse than a clear "not configured"
   error — it must never ship template text under an AI label.
3. **Operational simplicity.** Per-user encrypted keys and a persisted per-user
   provider choice are ceremony the single-operator install does not want. One
   central server key (env var) is enough, and the "no key" state must be a single,
   legible message.
4. **Terminology.** "Talent", "Mandat" and "Mandant" mean different things in the
   agency world than in the application world, and the super-admin console uses
   "Mandant" for "Workspace". The UI language must match the new product, not the
   old code.

## Decision

1. **Bewerbung zuerst.** The application flow becomes the primary path. The agency
   features (Suchaufträge, Pipeline, Platzierungen, Performance, Postfach,
   CoRecruiter) stay in the code but move behind a per-workspace feature switch
   **`vermittlung`**, default **off**. They are **frozen**: no further development
   until the application flow is presentable.
2. **Begriffe.** The UI and documentation switch to the new vocabulary —
   **Mandant** (the person applying; code `Talent`), **Suchauftrag** (the client's
   search assignment; code `Mandate`), **Workspace** (the tenant; code `Tenant`).
   Code identifiers are only renamed where a phase touches the code anyway; Phase 0
   converts the UI texts completely.
3. **Stellen.** A job can be adopted from the portal search or entered via URL or
   text; each job is stored with its full ad text (new `JobPosting` entity, Phase 1).
4. **Magic Pen.** Each Bewerbung owns its own copy of CV + cover letter; the
   Mandant's base CV is never mutated. Per-section before/after editing plus one
   "alles anpassen" action (Phase 3).
5. **Agent.** A chat agent with tools that reuses the same services as the UI,
   creates only drafts, and never sends anything (Phase 5).
6. **KI-Key.** One central key per server via env (`ANTHROPIC_API_KEY` default,
   `GEMINI_API_KEY` optional). **No template fallback**: without a key, AI routes
   answer `503` problem+json with type `ai-not-configured`, and the UI shows
   "KI nicht eingerichtet". Per-user API keys are removed.
7. **Abschluss.** The Bewerbungsmappe is downloaded as PDF/ZIP and the owner submits
   it themselves; status follows Entwurf → versendet → Gespräch → Zusage/Absage,
   with a per-Mandant overview (Phase 4).

Concretely, **Phase 0** realises decisions 1, 2 and 6: the `vermittlung` switch
(persisted in fs **and** sql), the full UI-text conversion, and the central-key
model with the removal of per-user keys and the template fallback.

## Consequences

**What this enables**

- A single, legible golden path: Mandant + CV → Stelle → Bewerbung → KI-Anschreiben
  → Magic-Pen-CV → Mappe → versendet.
- A clear AI contract: either a configured central key produces real AI output, or
  the surface says "KI nicht eingerichtet" and links to Settings. No template text
  is ever shown as AI.
- A simpler ops story: one env var, no per-user key store, no encrypted-secret UI.
- The frozen agency features stay reachable for existing agency users via one
  admin switch, with their data untouched.

**What it costs**

- The `vermittlung` switch is a new cross-cutting concern: every agency route needs
  a guard, the nav/settings need to react to it, and both persistence backends need
  a new settings store (fs + sql).
- Removing the template fallback touches the shared `LlmFeatureRunner` and every
  generative AI route; deterministic non-generative logic (matching, grounding,
  taxonomy) is explicitly **kept** and must not regress.
- Removing per-user keys touches the composition root, the SQL/fs adapters, the
  DSGVO personal-data registry, and the Settings UI, plus an idempotent data
  migration to delete stored keys.

**What it forecloses**

- No new work on the agency features until the application flow is presentable
  (decision 1). The old agency submission pipeline (ADR-0046/0048) is superseded by
  the new Bewerbung flow and, until then, hidden behind the switch.
- The per-user provider choice (ADR-0011) and the per-user encrypted key store are
  removed outright; the deterministic template fallback for user-visible
  generation (ADR-0005) is removed. Deterministic offline algorithms (ADR-0007/
  0008/0009) are unaffected.
- The agent's tool surface (Phase 5) is decided by its own ADR in that phase; this
  ADR fixes only that it reuses the same services and never sends.
