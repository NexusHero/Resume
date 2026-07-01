import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';
import { tokenize } from './ats-ai';
import { jobClusters, skillMatchesJob } from './skill-semantics';
import { canonicalizeSkills } from './skill-taxonomy';

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

/** Skills a candidate demonstrably has, taken from their document set. */
export function documentSkills(documents: TalentDocuments | null): string[] {
  if (!documents) return [];
  const all = [
    ...documents.resume.skillGroups.flatMap((g) => g.items),
    ...documents.resume.experience.flatMap((e) => e.skills),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return canonicalizeSkills(all);
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

function candidateFacts(documents: TalentDocuments): string {
  const { contact, resume } = documents;
  const roles = resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(' @ '))
    .filter(Boolean);
  const skills = documentSkills(documents);
  return [
    contact.name ? `Name: ${contact.name}` : '',
    contact.role ? `Rolle: ${contact.role}` : '',
    resume.summary ? `Profil: ${resume.summary}` : '',
    roles.length ? `Stationen: ${roles.join('; ')}` : '',
    skills.length ? `Skills: ${skills.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function explainPrompt(
  documents: TalentDocuments,
  mandate: MandateContext,
  matchedSkills: string[],
): { system: string; prompt: string } {
  return {
    system:
      'Du bist Personalberater:in und begründest kurz und ehrlich, warum ein:e Kandidat:in ' +
      'auf ein Mandat passt. Keine erfundenen Fakten, nur was aus den Angaben hervorgeht. ' +
      'Gib AUSSCHLIESSLICH gültiges JSON in genau diesem Schema zurück (keine Erklärung, ' +
      'keine Markdown-Fences): {"summary":"","reasons":["",""]}. ' +
      'summary = eine Zeile „Warum passt diese:r Kandidat:in". reasons = 2–4 konkrete, ' +
      'belegbare Gründe (Skills, Stationen, Rolle). Wenn etwas fehlt, benenne es fair.',
    prompt:
      `Mandat: ${mandate.role}${mandate.client ? ` bei ${mandate.client}` : ''}` +
      `${mandate.location ? `, ${mandate.location}` : ''}\n` +
      `${matchedSkills.length ? `Überschneidende Skills: ${matchedSkills.join(', ')}\n` : ''}` +
      `\nKandidat:\n${candidateFacts(documents)}`,
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
  const name = documents?.contact.name || 'Der:die Kandidat:in';
  const reasons: string[] = [];

  if (matchedSkills.length) {
    reasons.push(`Passende Skills zum Mandat: ${matchedSkills.slice(0, 6).join(', ')}.`);
  }
  const firstStation = documents?.resume.experience[0];
  if (firstStation && (firstStation.role || firstStation.company)) {
    reasons.push(
      `Relevante Erfahrung als ${[firstStation.role, firstStation.company]
        .filter(Boolean)
        .join(' bei ')}.`,
    );
  }
  if (documents?.resume.summary) {
    reasons.push(documents.resume.summary.replace(/\s+/g, ' ').trim().slice(0, 200));
  }
  if (reasons.length === 0) {
    reasons.push(
      'Noch keine belastbaren Belege im Profil — im Erstgespräch die Eignung für die Rolle prüfen.',
    );
  }

  const summary = matchedSkills.length
    ? `${name} bringt ${matchedSkills.length} passende Kompetenz${
        matchedSkills.length === 1 ? '' : 'en'
      } für „${mandate.role}" mit.`
    : `${name} — Eignung für „${mandate.role}" im Gespräch klären.`;

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
