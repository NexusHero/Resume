import { z } from 'zod';

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
 * Deterministic English cover-letter template. Used as the fallback when no LLM
 * provider is configured, and mirrors the applicant app's local draft so the
 * UX is identical with or without a model.
 */
export function coverLetterTemplate(req: CoverLetterRequest, me: CandidateIdentity): string {
  const focus = req.skills.slice(0, 2).join(' and ') || 'software engineering';
  const where = req.city ? ` in ${req.city}` : '';
  return (
    `Dear ${req.company} team,\n\n` +
    `I read your posting for the ${req.role} role${where} with great interest. ` +
    `As a ${me.title} focused on ${focus}, I bring exactly the experience you are looking for.\n\n` +
    `I would welcome the opportunity to discuss my application in person.\n\n` +
    `Kind regards\n${me.name}`
  );
}

/** Build the system + user prompt for an LLM-generated cover letter. */
export function coverLetterPrompt(
  req: CoverLetterRequest,
  me: CandidateIdentity,
): { system: string; prompt: string } {
  const system =
    'You are an experienced career coach writing in English. ' +
    'Write a concise, professional cover letter (4–6 sentences, inclusive, ' +
    'no clichés). Output only the cover-letter text — no placeholders ' +
    'like [date], no explanations, no markdown formatting.';
  const skills = req.skills.length ? req.skills.join(', ') : '—';
  const prompt =
    `Applicant: ${me.name} (${me.title}).\n` +
    `Role: ${req.role} at ${req.company}${req.city ? ` in ${req.city}` : ''}.\n` +
    `Required skills: ${skills}.\n\n` +
    `Write the cover letter. Close with "Kind regards" and the name.`;
  return { system, prompt };
}
