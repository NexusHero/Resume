import { z } from 'zod';
import type { TalentDocuments } from './talent-documents.js';
import type { OutputLang } from './language.js';
import { candidateFacts } from './candidate-facts.js';

/**
 * POST /api/v1/talents/:id/documents/pitch — an optional mandate/job context to
 * tailor the pitch. Empty context still yields a general "why this candidate"
 * profile from the talent's own facts.
 */
export const pitchRequestSchema = z.object({
  mandateContext: z.string().max(50_000).default(''),
});

/** A short "why this candidate" profile a recruiter presents to a client. */
export interface CandidatePitch {
  headline: string; // one-line hook
  paragraphs: string[]; // 2–3 short paragraphs
  highlights: string[]; // 3–5 bullet strengths
}

/** The shape the LLM must return; validated leniently, then normalized. */
export const pitchResultSchema = z.object({
  headline: z.string().default(''),
  paragraphs: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
});

export function pitchPrompt(
  documents: TalentDocuments,
  mandateContext: string,
  lang: OutputLang = 'en',
): { system: string; prompt: string } {
  const system =
    'You are a recruitment consultant writing a short candidate profile that you ' +
    'present to the client (the mandate) — persuasive, credible, free of empty phrases ' +
    'and without inventing facts. Return ONLY valid JSON in exactly this schema (no ' +
    'explanation, no Markdown fences): ' +
    '{"headline":"","paragraphs":["",""],"highlights":["",""]}. ' +
    'headline = one concise line "why this candidate". paragraphs = 2–3 short ' +
    'paragraphs on suitability. highlights = 3–5 bullet-point strengths.' +
    (lang === 'de' ? ' Antworte ausschließlich auf Deutsch.' : ' Respond in English only.');
  return {
    system,
    prompt: `Candidate:\n${candidateFacts(documents, { education: true })}\n\nMandate/role context:\n"""\n${
      mandateContext || '(not provided — general profile)'
    }\n"""`,
  };
}

/** Trim/clamp an LLM-produced pitch into a clean CandidatePitch. */
export function normalizePitch(raw: z.infer<typeof pitchResultSchema>): CandidatePitch {
  const clean = (list: string[], max: number): string[] =>
    list
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, max);
  return {
    headline: raw.headline.replace(/\s+/g, ' ').trim(),
    paragraphs: clean(raw.paragraphs, 3),
    highlights: clean(raw.highlights, 5),
  };
}
