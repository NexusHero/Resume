# ADR-0017 — Matching v2: local embeddings behind a port, hybrid scoring

- **Status:** Accepted
- **Relates to:** ADR-0006, ADR-0007, ADR-0008

## Context

Matching v1 scores a candidate by the share of their skill list the ad
mentions (canonicalized, ontology- and fuzzy-aware — ADR-0007/0008). That is
transparent and fast, but blind to everything outside the skill list: a
candidate whose CV bullets are full of the ad's domain vocabulary scores the
same as one whose bullets are not. Neural embedding APIs would close that gap
but violate the project's ground rules: candidate text would leave the server
(DSGVO), matching would stop working offline, and every ranking would cost
tokens.

## Decision

Add a semantic signal that keeps all three guarantees, and hide the
implementation behind a port:

- **`EmbeddingProvider` port** (`embed(text) → number[]`): matching depends
  on the port, never on a concrete embedding. This is the same dependency
  inversion that keeps LLM providers swappable — a neural model (local ONNX
  or a self-hosted service) can replace the default without touching any
  caller.
- **Default adapter: hashed lexical embeddings** (`domain/embedding`, pure):
  word unigrams + character trigrams, signed-feature-hashed into a 256-dim
  vector, log-tf weighted, L2-normalized; similarity is cosine. Deterministic,
  dependency-free, no model download. Honestly named: it is a _lexical_
  vector — near-synonyms only meet through shared character n-grams — but it
  is robust to inflections, German compounds and typos, exactly where token
  matching loses candidates.
- **Hybrid score, skills first:** `score = 0.7 × skillScore + 0.3 ×
semanticScore`. Demonstrated skills stay decisive; the text signal breaks
  ties and rescues bullet-point fits. The response carries all three numbers
  (`score`, `skillScore`, `semanticScore`) so the blend is inspectable, and
  the UI shows the breakdown.

## Consequences

- Ranking improves on sparse skill lists and German-language material at zero
  cost and zero data egress; results stay reproducible (same inputs → same
  ranking).
- A lexical vector is not a semantic model: "Krankenpfleger" and "Pflegekraft"
  meet only partially. When that ceiling matters, a neural adapter slots in
  behind the port — the migration is an adapter + container line, not a
  refactor.
- Embeddings are computed per request (pool × 1 embed each). At desk-scale
  pool sizes this is sub-millisecond work; caching per talent is the known
  lever if pools grow.
- The 70/30 blend is a judgment call, documented in `HYBRID_WEIGHTS`; the
  outcome loop (ADR-0014) is the eventual arbiter for tuning it.
