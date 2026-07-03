# ADR-0019 — Autopilot: the auto-apply gear of the one agent

- **Status:** Accepted
- **Relates to:** ADR-0013, ADR-0014, ADR-0017

## Context

The assistant (ADR-0013) is a token-free co-pilot: it shortlists, flags stale
cards and data gaps, and — in `act` — applies internal reversible actions.
The recruiter's most tedious work, though, is the whole application chain done
by hand: find a matching candidate, tailor the CV, write the cover letter in
the ad's language, assemble the Bewerbungsmappe with certificates, record it.
The user wanted that automated — and applicable to two worlds: the job
postings received from the boards, or the recruiter's own client mandates —
without a second, duplicated agent and without losing the semi-automatic
co-pilot they already liked.

## Decision

Keep **one agent with a single autonomy scale**, and add a top gear.

- **Autonomy is now `suggest` → `act` → `autopilot`.** The first two are
  unchanged and stay token-free. `autopilot` additionally builds a complete
  application packet for each strong match and stages it in the same review
  queue as a new `application` suggestion. It spends AI tokens; the heavy work
  lives in an isolated `ApplicationBuilder` module the assistant calls only in
  this gear, so the co-pilot's clean contract is untouched.
- **One target abstraction covers both worlds.** `ApplicationTarget` normalizes
  a mandate or a received job posting to the same shape (ad text, language,
  role/company/location, ref). A setting `applySource` (`jobs` | `mandates`)
  picks the source; the orchestration — match → tailor → dossier → stage — is
  written once. A job-board opening is materialized into a mandate only on
  **approval** (the existing "mandate from a posting" path), so from there on
  there is exactly one downstream flow (mandate → candidacy) and the outcome
  loop / forecast keep working uniformly.
- **The canonical documents are never touched.** Tailoring returns a snapshot
  (tuned summary + cover-letter body, in the ad's language) stored on the
  suggestion's payload; the Bewerbungsmappe renders from that snapshot. The
  candidate's stored CV is never overwritten — the whole thing is reversible by
  dismissing.
- **Nothing goes out on its own.** Approving stages the candidate into the
  pipeline; the actual outward submission stays a manual step (mandates carry
  no client address yet). Autopilot bounds its token spend per run (a build cap
  plus a minimum match score) and dedups so it never rebuilds an application it
  already staged.
- **Reuse over duplication.** Matching (`rankForJobText` added beside
  `rankForMandate`), tailoring (`DocumentAiService.tailorForMandate`), the
  dossier renderer (refactored to render from supplied content), attachments,
  the candidacy service, the mandate service, and the assistant's own settings
  store + suggestion queue + scheduler are all reused. The only new persistence
  is the snapshot riding in the existing suggestion payload — no new store.

## Consequences

- The recruiter gets a real autopilot: one gear switch turns the tedious
  application chain into a one-click approval, for job-board openings or own
  mandates, in the ad's language, offline-capable (template fallback).
- The assistant now has a token-spending gear; its cost is visible (per-call
  usage + the KI-Audit-Trail from ADR-0018) and bounded per run.
- Snapshot-not-overwrite keeps trust: a grounding self-check flags unsupported
  claims on the staged packet, and dismissing leaves the candidate's real
  documents exactly as they were.
- Outward submission is deliberately deferred; wiring it needs a client-contact
  field on the mandate and a confirmation step, a natural follow-up on top of
  the existing mail integration.
