# ADR-0057 — Produkt-Schwenk: Bewerbungsservice zuerst

- **Status:** Accepted
- **Partially supersedes:** ADR-0005 (the deterministic template fallback and the per-user API keys; the metering and grounding parts stay; the CV import keeps a named text-only mode without AI), ADR-0011 (the per-user key half; the persisted provider choice stays), ADR-0055 (the six-destination navigation is now conditional on the workspace switch)
- **Relates to:** ADR-0004 (RBAC), ADR-0010/0033 (scope ownership), ADR-0012 (zod + RFC-9457), ADR-0013/0014/0015/0019 (assistant, outcome loop, mail, autopilot — frozen behind the switch), ADR-0021 (plan gating, unchanged), ADR-0045 (no fabricated data), ADR-0046/0048 (applications), ADR-0051 (NestJS at the edge, hexagonal core)
- **Requirements:** FR-30, FR-31, FR-43 (changed); FR-70 to FR-73 (new). The implementation plan is [`../plans/phase-0-fundament.md`](../plans/phase-0-fundament.md).

## Context

myJob was built as a **recruiter desk**: client search assignments (code: `Mandate`),
a talent pool (code: `Talent`), a pipeline per assignment, placements, fees, a
performance view, a mailbox and an in-process "CoRecruiter" agent. The application
flow (a CV, a cover letter, a Bewerbungsmappe for one posting) is a side feature of
that desk.

The owner decided to turn the product around: the **application service is the main
path** — a person (the client we apply for) has one base CV, we find or paste a
posting, create an application for that posting, write a tailored cover letter,
adapt the CV for that posting, download the Mappe and track the status. The recruiter
features stay valuable but must not compete for attention, must not look half-finished
next to the new main path, and must not be developed further until the main path is
demonstrable on a live instance.

Three further problems surfaced while planning that path:

1. **Vocabulary collides.** In the UI "Talent" means the person, "Mandat" the firm's
   assignment, and "Mandant" the tenant (super-admin console). A job seeker's own
   words for these are different, and "Mandant" is the natural German word for the
   person on whose behalf we apply.
2. **AI that silently is not AI.** ADR-0005 makes every AI feature degrade to a
   deterministic template when no key is configured or the call fails. For
   recruiter drafts that was a reasonable offline story. For a cover letter that a
   person sends to an employer it is a trap: a generic template looks like a result,
   the badge "Template · no AI" is easy to miss, and the user may send it.
3. **Per-user keys are the wrong ownership unit.** ADR-0005/0011 store an encrypted
   API key per user. In a workspace that offers the service to its clients the
   operator pays and controls the AI budget, so a key per person adds a settings
   screen, a failure mode ("key configured but unused"), an encryption secret that
   guards nothing else, and an erasure step — for no product value.

## Decision

1. **Application service first.** The application flow is the main path of the
   product and of the navigation. The recruiter functions — Suchaufträge
   (`Mandate`), their pipelines, candidacies, placements and fees, performance,
   forecast, interview observations, outcome log, mailbox/reply sync, outreach and
   pitch, match explanation / interview kit / prep kit, the AGG check of an
   assignment's ad, and the CoRecruiter assistant with autopilot — keep their code,
   data and tests but are **frozen**: nothing is developed on them until the main
   path is demonstrable.
2. **A workspace switch `vermittlung`, default off.** It is a per-workspace setting
   held in a new scope-keyed `WorkspaceSettingsStore` (file and Postgres adapters).
   Only a workspace admin may change it. It is enforced **on the server** by a Nest
   guard on every recruiter route (404 `problem+json` when off, evaluated after
   authentication so it leaks nothing to anonymous callers) and mirrored in the UI,
   which hides the navigation entries and never calls those routes. Turning the
   switch off hides and blocks; it deletes nothing, and turning it on shows the
   data unchanged. Scheduled jobs that belong to the recruiter functions (assistant
   runs, reply sync) skip workspaces where it is off. The default is off for every
   workspace, including existing ones (owner decision); there is no automatic
   backfill. So that this is not a silent surprise, the server logs a warning at
   boot for every workspace that holds recruiter data while the switch is off, and
   the changelog explains how to switch it on. The UI reads the switch from the
   server (`GET /settings/workspace`), it is not derived from the login response.
3. **Vocabulary (UI and docs; code names only when a phase touches the code anyway).**
   _Mandant_ = the person with a base CV who applies (code: `Talent`);
   _Suchauftrag_ = a firm's search assignment (code: `Mandate`);
   _Workspace_ = the working area / tenant (code: `Tenant`);
   _Stelle_ = a saved job posting (new entity `JobPosting`, a later phase);
   _Bewerbung_ = Stelle × Mandant (code: `Application`). All user-visible text is
   switched in one go; a test checks the UI strings against a deny-list. No big-bang
   rename of identifiers, routes or database columns.
4. **One central AI key per server, no substitute text.** The server reads
   `ANTHROPIC_API_KEY` (default provider) and optionally `GEMINI_API_KEY`. Without any
   key every AI route answers **503 `problem+json` of type `ai-not-configured`**;
   the UI shows "KI nicht eingerichtet" with a link to the settings and sends no
   request. There is **no template fallback anywhere on an AI route**, and a failed
   provider call or an unusable provider reply is an error (502), not a silent
   downgrade. The deterministic template builders are deleted. Deterministic,
   offline analysis that is not text generation (skill matching, grounding check,
   keyword ATS gap analysis, AGG check) stays as it is. Every AI route needs a
   signed-in user (breaking change, noted in the changelog: the cover-letter route no longer serves anonymous callers from the
   shared key).
   **One owner-decided exception: the CV import.** Reading a CV into the structured
   model (`parse`, `parse-pdf`, bulk import) has no rule-based parser to fall back on
   (the old fallback only cut 600 characters into the short profile). Without a key
   the import therefore runs as an explicitly named mode, **"Text übernehmen (ohne
   KI)"**: the full CV text is stored (`resume.rawText`, up to the existing 50,000
   character limit), an uploaded PDF is kept as an attachment of the Mandant, the
   editor only fills empty fields and never overwrites an existing section, and
   structuring into stations and skills is available only with AI. Das abgelegte PDF
   ist ein Referenz-Anhang, nicht vorausgewählt und wird nie automatisch angehängt.
   The response says
   `mode: 'text'` instead of a provider name and the UI states "Text übernommen (ohne
   KI) — Stationen und Skills bitte manuell ergänzen oder KI in den Einstellungen
   einrichten". With a key the AI is used (`mode: 'ai'`); if that call fails the
   import fails with 502, it does not quietly downgrade to text mode. These routes
   therefore do not answer 503. A PDF without readable text (a scan or a protected
   file) cannot be used in either mode and answers 422 `no-text-layer`.
   The stored raw text (`resume.rawText`) contains all personal data of the CV, so it
   is an **internal raw source**: it is part of the DSGVO export, it is never rendered,
   never part of a Mappe (the ZIP's embedded data file included), never sent to a
   model except as the input of the AI import itself (translation prompts exclude
   it), and it is cleared when a Mandant is anonymized.
5. **Per-user API keys are removed.** The routes, the `ApiKeyStore` port with both
   adapters, the secret cipher that only protected them and the UI to enter a key are
   deleted. Stored keys are ignored from the first request on and are deleted by an
   idempotent migration on boot (file store: the key file removed; Postgres:
   `DELETE FROM api_keys`). The Postgres table itself is **kept empty in this release**
   (expand/contract) and dropped in a later one, so instances of the previous version
   that still read it during a rolling deploy keep working.
   The persisted per-user _provider choice_ (ADR-0011) is kept, limited to providers
   that have a server key.

The later phases (saved postings with full ad text, an application entity with its own
document copy, per-section "Magic Pen", the finishing flow, a chat agent that only
creates drafts) get their own ADRs when they are taken; this one fixes the direction,
the switch, the vocabulary and the AI-key policy they build on.

## Consequences

- A fresh workspace shows only Workspace, Mandanten, Stellen, Bewerbungen and
  Einstellungen, so the demo path has no half-finished recruiter screens and no dead
  buttons. The recruiter code stays in the coverage base, so it must keep compiling
  and passing; its acceptance tests must switch the setting on for their workspace.
- The "works with no key at all" promise of ADR-0005 narrows: the core (accounts,
  Mandanten, CV and cover-letter editing, PDF/Mappe, application tracking, the text-only
  CV import) still runs with no key and no network, but every AI feature needs a
  configured server key — summaries, letters, tailoring, translation, ATS scoring. An operator without a key sees a clear
  message instead of weak text. Documentation that promised "fully functional with no
  LLM key" and the `Template · no AI` badge (FR-30, FR-43) must be reworded.
- One credential, one place: the operator owns cost and availability, a missing key is
  an operations problem that the readiness check and the settings page can name, and
  usage metering (ADR-0005) stays per user for attribution. The cost: a workspace can
  no longer bring its own key, and the key rotates only by restarting the server.
- The deletion of the stored user key rows is irreversible. Because the table is only
  emptied (not dropped) in this release, old instances in a rolling deploy find an
  empty table and simply see no user key; dropping the table is a follow-up for the
  next release.
- Existing installations that use the recruiter functions lose their navigation
  entries after the upgrade until an admin switches `vermittlung` on; this is a
  deliberate consequence of "default off" (owner decision), announced in the
  changelog and as a boot warning per affected workspace.
- The API keeps its recruiter vocabulary (`/mandates`, `/talents`); the UI and the
  docs use the new one. Two vocabularies coexist until a later phase renames code it
  is touching anyway, and the glossary documents the mapping.
- Reversal is cheap for the switch (flip it) and expensive for the AI policy (the
  template builders and the key store are gone and would have to be rebuilt).
