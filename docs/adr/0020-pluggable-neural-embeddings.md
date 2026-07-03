# ADR-0020 — Pluggable neural embeddings (Ollama, OpenAI) behind the port

- **Status:** Accepted
- **Relates to:** ADR-0017 (local hashed embeddings), ADR-0005 (deterministic fallback), ADR-0006 (first-party data)

## Context

ADR-0017 matches candidates with **local hashed lexical vectors**: offline,
deterministic, DSGVO-safe, no per-call cost — but not neural, so near-synonyms
only meet through shared character n-grams. The natural upgrade is a real neural
embedding model. The question was **how** to add one without giving up the
offline/first-party default that is a selling point, and without a heavy always-on
dependency.

The `EmbeddingProvider` port (`embed(text) → number[]`) was designed for exactly
this swap, and the matcher embeds query and profile with the same provider per
ranking (vectors are never persisted), so a backend change needs no migration.

## Decision

Add **two opt-in neural backends behind the existing port**, with hashed as the
default and universal fallback.

- **`ollama`** — a local Ollama server (`POST {OLLAMA_URL}/api/embeddings`). Fully
  first-party: the model runs on the operator's own machine, so no candidate text
  leaves the deployment. This is the recommended neural option for DACH/EU.
- **`openai`** — the OpenAI embeddings API. Highest quality, but a **third-party
  data processor**; only selected when `OPENAI_API_KEY` is set, and it needs a
  compliance note in the customer's records.
- **`hashed`** (default) — unchanged ADR-0017 behaviour.

Selection is config only (`EMBEDDING_PROVIDER`, default `hashed`); no code path
changes. Both neural adapters:

- go through the shared `HttpFetch` port with a per-call **timeout**, so they are
  unit-tested against recorded JSON and can't hang a ranking;
- **L2-normalize** the returned vector, so `cosine`/`similarityScore` stay in range
  whatever the backend's magnitude convention (the shared `l2normalize` helper);
- **fall back to hashed on any error, timeout, empty text or malformed reply** —
  matching degrades, never breaks (ADR-0005 extended to embeddings). Choosing
  `openai` without a key stays hashed rather than 401 on every ranking.

## Consequences

- The offline, no-dependency, DSGVO-safe default is preserved; neural quality is a
  config switch away, and the abstraction meant **zero changes to the matcher**.
- `ollama` keeps the first-party guarantee (ADR-0006) while giving real neural
  embeddings — the best fit for privacy-sensitive buyers.
- `openai` introduces a third-party processor; the trade-off is explicit and gated
  behind an env key. The EU-AI-Act brief notes that only this option leaves the
  first-party boundary.
- Cost/latency: the port is one-text-per-call, so a ranking makes N+1 embed calls.
  For team-sized pools this is fine; batching (the OpenAI API accepts arrays) and a
  per-run cache are a natural follow-up if pools grow large.
- Mixed dimensions across backends can't corrupt a score: vectors are unit-length
  and `cosine` truncates to the shorter length, so a rare transient fallback within
  one ranking yields a bounded (if slightly noisier) number, not a crash.
