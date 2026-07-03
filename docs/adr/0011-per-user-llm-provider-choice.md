# ADR-0011 — Per-user, persisted LLM provider choice

- **Status:** Accepted
- **Relates to:** ADR-0004, ADR-0005

## Context

The provider selection (Claude vs Gemini) originally lived in server memory on
`LlmService` — reasoned as "an operator preference, not user data". A live test showed
that reasoning was wrong twice over: API keys (and quota, and cost) are **per user**
(ADR-0005), so the selection is user data after all. In memory it (a) silently reset to
the configured default on every restart — a user with only a Gemini key then ran in
template mode with no hint — and (b) was shared process-wide, so one user switching
flipped the provider for the whole team.

## Decision

Persist the choice on the **user record** (`User.llmProvider`, fs + sql stores), not in
a separate settings store and not in the browser:

- `PUT /api/v1/settings/llm` requires a session and stores the caller's choice;
  `GET` reports the caller's own choice, signed-out readers see the configured default.
- `DocumentAiService.resolveProvider` (and the cover-letter override) read the stored
  choice first and fall back to the server default.
- `LlmService` shrinks to a plain registry: which providers exist, which have server
  credentials, what is the default. It no longer carries mutable state.

The stored value is just a provider id behind the `LlmProvider` port, so the mechanism
is provider-agnostic — a future third adapter needs no changes here.

## Consequences

- The choice survives restarts and never leaks across accounts; the trap class
  "key configured but silently unused" is gone.
- One more field on `User` (and an idempotent `ALTER TABLE` for sql) instead of a new
  store — deliberate: the choice is account data with account lifetime (deleted with
  the account, exported with it).
- Signed-out flows (the launcher cover-letter page) keep working against the
  configured default; per-user behaviour needs a session by definition.
