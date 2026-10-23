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
