import type { TalentDocuments } from './talent-documents';
import { tokenize } from './ats-ai';
import { jobClusters, skillMatchesJob, isKnownSkillToken } from './skill-semantics';
import { documentSkills } from './match-explain';

/**
 * Grounding self-check — a deterministic verifier that flags factual claims in
 * generated text that the source (the candidate's CV + the mandate/ad) does not
 * support. It is the quality/trust multiplier over our LLM outputs: catch a
 * fabricated skill or an inflated "10 Jahre Erfahrung" before it reaches a
 * client. High-precision by design (numbers-with-units and known skills only),
 * so it warns rather than cries wolf — in German, where every noun is
 * capitalized, generic entity-matching would be pure noise.
 */
export type ClaimKind = 'number' | 'skill';

export interface GroundingFinding {
  kind: ClaimKind;
  text: string; // the unsupported claim, as it appears in the generated text
}

export interface GroundingReport {
  grounded: boolean; // no unsupported claims found
  unsupported: GroundingFinding[];
}

/** Build the grounding source text from a candidate's documents. */
export function groundingSource(documents: TalentDocuments | null, extra = ''): string {
  if (!documents) return extra;
  const { resume } = documents;
  const parts = [
    resume.summary,
    ...documentSkills(documents),
    ...resume.experience.flatMap((e) => [e.role, e.company, ...e.bullets]),
    extra,
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * Check that the factual claims in `generated` are supported by `source`.
 * Only two high-signal claim kinds are checked:
 *  - numbers with a unit (years / %), e.g. "10 Jahre Erfahrung";
 *  - known skill tokens from the ontology (a fabricated tech).
 */
export function checkGrounding(generated: string, source: string): GroundingReport {
  const srcLower = source.toLowerCase();
  const srcTokens = tokenize(source);
  const srcClusters = jobClusters(srcTokens);
  const unsupported: GroundingFinding[] = [];
  const seen = new Set<string>();
  const flag = (kind: ClaimKind, text: string): void => {
    const key = `${kind}:${text.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unsupported.push({ kind, text });
    }
  };

  // 1. Numbers with a unit (German or English) — the value must appear in the source.
  for (const m of generated.matchAll(
    /(\d+)\s*(?:\+\s*)?(jahren?|jahre|years?|%|prozent|percent)/gi,
  )) {
    const value = m[1] as string;
    if (!new RegExp(`\\b${value}\\b`).test(srcLower)) flag('number', m[0].trim());
  }

  // 2. Known skills claimed in the text that the source does not evidence.
  for (const token of tokenize(generated)) {
    if (isKnownSkillToken(token) && !skillMatchesJob(token, srcTokens, srcClusters)) {
      flag('skill', token);
    }
  }

  return { grounded: unsupported.length === 0, unsupported };
}
