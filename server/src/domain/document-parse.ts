import { z } from 'zod';

/** POST /api/v1/talents/:id/documents/parse */
export const parseRequestSchema = z.object({
  text: z.string().min(1, 'text is required').max(50_000),
});

/**
 * POST /api/v1/talents/:id/documents/parse-pdf — a CV uploaded as a base64 PDF
 * (JSON-only API, same cap as attachments: ~15 MB raw → ~20 MB base64).
 */
export const parsePdfRequestSchema = z.object({
  dataBase64: z.string().min(1, 'file is required').max(21_000_000),
});
export type ParsePdfRequestInput = z.infer<typeof parsePdfRequestSchema>;

/**
 * Prompt + helpers for turning a pasted CV (plain text) into our structured
 * resume model. The LLM is asked to return strict JSON; the service validates
 * it against the documents schema, so a malformed reply falls back safely.
 */
export function parsePrompt(text: string): { system: string; prompt: string } {
  return {
    system:
      'You are a resume parser. Extract the details from the text and ' +
      'return ONLY valid JSON in exactly this schema (no explanation, ' +
      'no Markdown fences):\n' +
      '{"contact":{"name":"","role":"","email":"","phone":"","location":"","linkedin":""},' +
      '"resume":{"summary":"","experience":[{"role":"","company":"","period":"","location":"",' +
      '"bullets":[""],"skills":[""]}],"education":[{"degree":"","school":"","period":"","note":""}],' +
      '"skillGroups":[{"label":"","items":[""]}]}}\n' +
      'Do not invent anything. Leave unknown fields empty or as an empty list.',
    prompt: `Resume text:\n"""\n${text}\n"""`,
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
