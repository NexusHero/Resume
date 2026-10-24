import type { TalentDocuments } from './talent-documents.js';
import { tokenize } from './ats-ai.js';
import { jobClusters, skillMatchesJob, isKnownSkillToken } from './skill-semantics.js';
import { documentSkills } from './match-explain.js';

/**
 * Grounding self-check — a deterministic verifier that flags factual claims in
 * generated text that the source (the candidate's CV + the mandate/ad) does not
 * support. It is the quality/trust multiplier over our LLM outputs: catch a
 * fabricated skill or an inflated "10 Jahre Erfahrung" before it reaches a
 * client. High-precision by design, so it warns rather than cries wolf — in
 * German, where every noun is capitalized, generic entity-matching would be
 * pure noise. The claim kinds are deliberately narrow: numbers-with-units and
 * known skills (ADR-0009), plus — since ADR-0060 — four-digit years and known
 * degree tokens (so the Magic Pen cannot invent dates or degrees either).
 */
export type ClaimKind = 'number' | 'skill' | 'year' | 'degree';

export interface GroundingFinding {
  kind: ClaimKind;
  text: string; // the unsupported claim, as it appears in the generated text
}

export interface GroundingReport {
  grounded: boolean; // no unsupported claims found
  unsupported: GroundingFinding[];
}

/**
 * Build the grounding source text from a candidate's documents. Since ADR-0060
 * the source also carries `experience[].period` and every `education` entry
 * (degree + period), so the `year`/`degree` claim checks have a data source:
 * without them, a period or a degree the candidate actually has would be
 * wrongly flagged as fabricated.
 */
export function groundingSource(documents: TalentDocuments | null, extra = ''): string {
  if (!documents) return extra;
  const { resume } = documents;
  const parts = [
    resume.summary,
    ...documentSkills(documents),
    ...resume.experience.flatMap((e) => [e.role, e.company, e.period, ...e.bullets]),
    ...resume.education.flatMap((e) => [e.degree, e.period]),
    extra,
  ];
  return parts.filter(Boolean).join(' ');
}

/** Plausible four-digit year range (1900–2099) — high-signal, not arbitrary digits. */
const YEAR_PATTERN = /\b(19|20)\d{2}\b/g;
/** A period range like "2014–2018" (hyphen, en- or em-dash) covering every year between. */
const YEAR_RANGE_PATTERN = /\b((?:19|20)\d{2})\s*[–—-]\s*((?:19|20)\d{2})\b/g;

/** Every year the source evidences: standalone years plus each range's span. */
function coveredYears(source: string): Set<number> {
  const covered = new Set<number>();
  for (const m of source.matchAll(YEAR_RANGE_PATTERN)) {
    const start = Number(m[1]);
    const end = Number(m[2]);
    // A range is expanded inclusively; the cap keeps a pathological span cheap.
    if (end >= start && end - start <= 50) {
      for (let y = start; y <= end; y += 1) covered.add(y);
    } else {
      covered.add(start);
      covered.add(end);
    }
  }
  for (const m of source.matchAll(YEAR_PATTERN)) covered.add(Number(m[0]));
  return covered;
}

/**
 * Known degree tokens (ADR-0060). Each maps a display label to a word-bounded
 * matcher; the punctuation-heavy ones ("M.Sc.") keep their dots so a generated
 * "M.Sc." is matched, while bare "dr" never matches inside "driver".
 */
const DEGREE_TERMS: Array<[string, RegExp]> = [
  ['Bachelor', /\bbachelor\b/i],
  ['Master', /\bmaster\b/i],
  ['Diplom', /\bdiplom\b/i],
  ['MBA', /\bmba\b/i],
  ['PhD', /\bphd\b/i],
  ['Dr.', /\bdr\.\b/i],
  ['M.Sc.', /\bm\.\s?sc\.\b/i],
  ['B.Sc.', /\bb\.\s?sc\.\b/i],
  ['M.Eng.', /\bm\.\s?eng\.\b/i],
  ['B.Eng.', /\bb\.\s?eng\.\b/i],
  ['B.A.', /\bb\.\s?a\.\b/i],
  ['M.A.', /\bm\.\s?a\.\b/i],
  ['Ausbildung', /\bausbildung\b/i],
  ['Studium', /\bstudium\b/i],
  ['Promotion', /\bpromotion\b/i],
  ['Doktor', /\bdoktor\b/i],
  ['Staatsexamen', /\bstaatsexamen\b/i],
  ['Magister', /\bmagister\b/i],
];

/**
 * Check that the factual claims in `generated` are supported by `source`.
 * Four high-signal claim kinds are checked (ADR-0009 + ADR-0060):
 *  - numbers with a unit (years / %), e.g. "10 Jahre Erfahrung";
 *  - known skill tokens from the ontology (a fabricated tech);
 *  - four-digit years the source's periods do not cover;
 *  - known degree tokens the source's education entries do not evidence.
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

  // 3. Four-digit years the source does not cover (not even as a range boundary).
  for (const m of generated.matchAll(YEAR_PATTERN)) {
    if (!coveredYears(source).has(Number(m[0]))) flag('year', m[0]);
  }

  // 4. Known degree tokens the source's education entries do not evidence.
  for (const [label, re] of DEGREE_TERMS) {
    if (re.test(generated) && !re.test(source)) flag('degree', label);
  }

  return { grounded: unsupported.length === 0, unsupported };
}
