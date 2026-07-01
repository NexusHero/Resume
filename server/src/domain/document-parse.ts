import { z } from 'zod';

/** POST /api/v1/talents/:id/documents/parse */
export const parseRequestSchema = z.object({
  text: z.string().min(1, 'text is required').max(50_000),
});
export type ParseRequestInput = z.infer<typeof parseRequestSchema>;

/**
 * Prompt + helpers for turning a pasted CV (plain text) into our structured
 * resume model. The LLM is asked to return strict JSON; the service validates
 * it against the documents schema, so a malformed reply falls back safely.
 */
export function parsePrompt(text: string): { system: string; prompt: string } {
  return {
    system:
      'Du bist ein Parser für Lebensläufe. Extrahiere die Angaben aus dem Text und ' +
      'gib AUSSCHLIESSLICH gültiges JSON in genau diesem Schema zurück (keine Erklärung, ' +
      'keine Markdown-Fences):\n' +
      '{"contact":{"name":"","role":"","email":"","phone":"","location":"","linkedin":""},' +
      '"resume":{"summary":"","experience":[{"role":"","company":"","period":"","location":"",' +
      '"bullets":[""],"skills":[""]}],"education":[{"degree":"","school":"","period":"","note":""}],' +
      '"skillGroups":[{"label":"","items":[""]}]}}\n' +
      'Erfinde nichts. Lass unbekannte Felder leer bzw. als leere Liste.',
    prompt: `Lebenslauf-Text:\n"""\n${text}\n"""`,
  };
}

/** Extract a JSON object from an LLM reply that may be fenced or padded. */
export function extractJson(raw: string): unknown | null {
  const fenced = raw.replace(/```(?:json)?/gi, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Deterministic fallback when no LLM is available or the reply is unusable:
 * drop the raw text into the summary so nothing is lost, leave the rest empty.
 */
export function fallbackParsed(text: string): { contact?: unknown; resume: { summary: string } } {
  const summary = text.replace(/\s+/g, ' ').trim().slice(0, 600);
  return { resume: { summary } };
}
