import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';
import { tokenize } from './ats-ai';
import { candidateFacts, documentSkills } from './candidate-facts';
import { jobClusters, skillMatchesJob } from './skill-semantics';

// Re-exported from its new home so existing consumers keep one import path.
export { documentSkills } from './candidate-facts';

/**
 * "Why does this candidate fit?" — a short, grounded justification of a
 * talent's fit for a mandate, presented alongside the ranked shortlist. The
 * LLM writes it when available; a deterministic fallback assembles honest
 * reasons from the overlap between the candidate's skills and the mandate, so
 * the feature always returns something usable.
 */
export interface MandateContext {
  role: string;
  location: string;
  client?: string;
}

export interface MatchExplanation {
  summary: string; // one-line verdict
  reasons: string[]; // 2–4 grounded bullet reasons
  matchedSkills: string[]; // skills that answer the mandate
}

/** Which of the candidate's skills answer the mandate (semantic match). */
export function matchedForMandate(
  documents: TalentDocuments | null,
  mandate: MandateContext,
): string[] {
  const jobText = `${mandate.role} ${mandate.location}`;
  const tokens = tokenize(jobText);
  const clusters = jobClusters(tokens);
  return documentSkills(documents).filter((s) => skillMatchesJob(s, tokens, clusters));
}

export function explainPrompt(
  documents: TalentDocuments,
  mandate: MandateContext,
  matchedSkills: string[],
): { system: string; prompt: string } {
  return {
    system:
      'You are a recruiter and briefly and honestly explain why a candidate ' +
      'fits a mandate. No fabricated facts, only what follows from the given details. ' +
      'Return EXCLUSIVELY valid JSON in exactly this schema (no explanation, ' +
      'no markdown fences): {"summary":"","reasons":["",""]}. ' +
      'summary = a one-line "Why does this candidate fit". reasons = 2–4 concrete, ' +
      'verifiable reasons (skills, experience, role). If something is missing, name it fairly.',
    prompt:
      `Mandate: ${mandate.role}${mandate.client ? ` at ${mandate.client}` : ''}` +
      `${mandate.location ? `, ${mandate.location}` : ''}\n` +
      `${matchedSkills.length ? `Overlapping skills: ${matchedSkills.join(', ')}\n` : ''}` +
      `\nCandidate:\n${candidateFacts(documents)}`,
  };
}

/**
 * Deterministic fallback: honest reasons from the skill overlap and the
 * candidate's own stations — no LLM needed.
 */
export function fallbackExplanation(
  documents: TalentDocuments | null,
  mandate: MandateContext,
  matchedSkills: string[],
): MatchExplanation {
  const name = documents?.contact.name || 'The candidate';
  const reasons: string[] = [];

  if (matchedSkills.length) {
    reasons.push(`Skills matching the mandate: ${matchedSkills.slice(0, 6).join(', ')}.`);
  }
  const firstStation = documents?.resume.experience[0];
  if (firstStation && (firstStation.role || firstStation.company)) {
    reasons.push(
      `Relevant experience as ${[firstStation.role, firstStation.company]
        .filter(Boolean)
        .join(' at ')}.`,
    );
  }
  if (documents?.resume.summary) {
    reasons.push(documents.resume.summary.replace(/\s+/g, ' ').trim().slice(0, 200));
  }
  if (reasons.length === 0) {
    reasons.push(
      'No strong evidence in the profile yet — assess fit for the role in a first call.',
    );
  }

  const summary = matchedSkills.length
    ? `${name} brings ${matchedSkills.length} matching skill${
        matchedSkills.length === 1 ? '' : 's'
      } for "${mandate.role}".`
    : `${name} — clarify fit for "${mandate.role}" in a call.`;

  return { summary, reasons: reasons.slice(0, 4), matchedSkills };
}

/** The shape the LLM must return; validated leniently, then normalized. */
export const explanationResultSchema = z.object({
  summary: z.string().default(''),
  reasons: z.array(z.string()).default([]),
});

/** Trim/clamp an LLM explanation into a clean MatchExplanation. */
export function normalizeExplanation(
  raw: z.infer<typeof explanationResultSchema>,
  matchedSkills: string[],
): MatchExplanation {
  return {
    summary: raw.summary.replace(/\s+/g, ' ').trim(),
    reasons: raw.reasons
      .map((r) => r.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 4),
    matchedSkills,
  };
}
