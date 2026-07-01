# ADR-0008 — Skill canonicalization taxonomy

- **Status:** Accepted
- **Requirements:** FR-34
- **Relates to:** ADR-0007

## Context

Skills arrive as free text from CVs, job ads and manual entry: "React.js", "ReactJS" and
"react" are the same skill; "k8s" is "Kubernetes"; "ts" is "TypeScript". Without a
canonical form, matching double-counts, deduplication fails, and display is inconsistent —
a data-quality problem underneath every skill feature.

## Decision

Add a deterministic **taxonomy** (`domain/skill-taxonomy.ts`):

- `canonicalizeSkill(s)` maps a lowercased alias to its canonical display form, else
  returns the trimmed input unchanged (unknown skills are preserved, not dropped).
- `canonicalizeSkills(list)` canonicalises and **dedupes by canonical form**, keeping the
  canonical display casing.

Skill collection in `match.ts` and `match-explain.ts` runs inputs through it before
scoring/display.

## Consequences

- Variants unify at the source, so matching (ADR-0007) and grounding (ADR-0009) reason
  over clean, deduplicated tokens.
- The alias map is hand-maintained; unknown skills pass through untouched, so coverage
  gaps degrade gracefully rather than losing data.
