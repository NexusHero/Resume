import { z } from 'zod';
import type { OutputLang } from './language.js';

/** Who the letter is written as — drives the signature and self-description. */
export interface CandidateIdentity {
  name: string;
  title: string;
}

/** POST /api/v1/cover-letter request body. */
export const coverLetterRequestSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  city: z.string().optional(),
  /** Skills the posting asks for — woven into the letter. */
  skills: z.array(z.string()).default([]),
});
export type CoverLetterRequest = z.infer<typeof coverLetterRequestSchema>;

/**
 * Deterministic cover-letter template. Used as the fallback when no LLM
 * provider is configured, and mirrors the applicant app's local draft so the
 * UX is identical with or without a model. Defaults to English; pass
 * `lang === 'de'` for the German variant.
 */
export function coverLetterTemplate(
  req: CoverLetterRequest,
  me: CandidateIdentity,
  lang: OutputLang = 'en',
): string {
  if (lang === 'de') {
    const focus = req.skills.slice(0, 2).join(' und ') || 'Software Engineering';
    const ort = req.city ? ` in ${req.city}` : '';
    return (
      `Sehr geehrtes Team von ${req.company},\n\n` +
      `mit großem Interesse habe ich Ihre Ausschreibung als ${req.role}${ort} gelesen. ` +
      `Als ${me.title} mit Schwerpunkt ${focus} bringe ich genau die Erfahrung mit, die Sie suchen.\n\n` +
      `Über ein persönliches Gespräch freue ich mich sehr.\n\n` +
      `Mit freundlichen Grüßen\n${me.name}`
    );
  }
  const focus = req.skills.slice(0, 2).join(' and ') || 'Software Engineering';
  const location = req.city ? ` in ${req.city}` : '';
  return (
    `Dear ${req.company} team,\n\n` +
    `I read your posting for the ${req.role} role${location} with great interest. ` +
    `As a ${me.title} focused on ${focus}, I bring exactly the experience you are looking for.\n\n` +
    `I would be delighted to discuss my application in person.\n\n` +
    `Kind regards\n${me.name}`
  );
}

/** Build the system + user prompt for an LLM-generated cover letter. */
export function coverLetterPrompt(
  req: CoverLetterRequest,
  me: CandidateIdentity,
  lang: OutputLang = 'en',
): { system: string; prompt: string } {
  const system =
    'You are an experienced application coach. ' +
    'Write a concise, professional cover letter (4–6 sentences, inclusive language, ' +
    'no empty phrases). Output only the letter text — no placeholders ' +
    'like [Date], no explanations, no Markdown formatting.' +
    (lang === 'de'
      ? ' Schreibe das Anschreiben auf Deutsch.'
      : ' Write the cover letter in English.');
  const skills = req.skills.length ? req.skills.join(', ') : '—';
  const prompt =
    `Candidate: ${me.name} (${me.title}).\n` +
    `Position: ${req.role} at ${req.company}${req.city ? ` in ${req.city}` : ''}.\n` +
    `Required skills: ${skills}.\n\n` +
    `Write the cover letter. Close with a sign-off and the name.`;
  return { system, prompt };
}
