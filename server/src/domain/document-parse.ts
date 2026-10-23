import { z } from 'zod';

/** POST /api/v1/talents/:id/documents/parse */
export const parseRequestSchema = z.object({
  // A long CV is accepted and truncated server-side to {@link MAX_IMPORT_TEXT}
  // (both text and ai mode set the `truncated` flag at >50k, ADR-0057) — the
  // boundary must not reject an over-limit text with a 400.
  text: z.string().min(1, 'text is required'),
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

/** How a CV was imported: the named text-only mode, or structured AI parsing. */
export type ImportMode = 'text' | 'ai';

/** The import limit shared by the text mode and the PDF extractor. */
export const MAX_IMPORT_TEXT = 50_000;

/**
 * The named text-only import ("Text übernehmen (ohne KI)"): keep the full CV
 * text for manual take-over. No parser, no summary, no invented structure.
 * Texts over {@link MAX_IMPORT_TEXT} are cut and reported as truncated.
 */
export function takeText(text: string): {
  resume: { rawText: string };
  truncated: boolean;
} {
  const trimmed = text.trim();
  const truncated = trimmed.length > MAX_IMPORT_TEXT;
  return {
    resume: { rawText: truncated ? trimmed.slice(0, MAX_IMPORT_TEXT) : trimmed },
    truncated,
  };
}
