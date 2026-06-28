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
 * Deterministic German cover-letter template. Used as the fallback when no LLM
 * provider is configured, and mirrors the applicant app's local draft so the
 * UX is identical with or without a model.
 */
export function coverLetterTemplate(req: CoverLetterRequest, me: CandidateIdentity): string {
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

/** Build the system + user prompt for an LLM-generated cover letter. */
export function coverLetterPrompt(
  req: CoverLetterRequest,
  me: CandidateIdentity,
): { system: string; prompt: string } {
  const system =
    'Du bist ein erfahrener Bewerbungs-Coach und schreibst auf Deutsch. ' +
    'Verfasse ein prägnantes, professionelles Anschreiben (4–6 Sätze, gender-inklusiv, ' +
    'ohne Floskeln). Gib ausschließlich den Anschreibentext aus — keine Anrede-Platzhalter ' +
    'wie [Datum], keine Erklärungen, keine Markdown-Formatierung.';
  const skills = req.skills.length ? req.skills.join(', ') : '—';
  const prompt =
    `Bewerber:in: ${me.name} (${me.title}).\n` +
    `Stelle: ${req.role} bei ${req.company}${req.city ? ` in ${req.city}` : ''}.\n` +
    `Geforderte Skills: ${skills}.\n\n` +
    `Schreibe das Anschreiben. Schließe mit „Mit freundlichen Grüßen" und dem Namen.`;
  return { system, prompt };
}
