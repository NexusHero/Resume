import { z } from 'zod';
import type { OutputLang } from './language.js';
import { type TalentDocuments, resumeSchema, letterSchema } from './talent-documents.js';

/**
 * Translate a talent's documents (resume + cover letter) into another language.
 * Unlike the other AI features this has no useful deterministic fallback — a
 * job application cannot be machine-translated offline with acceptable quality —
 * so it requires an LLM provider. The recruiter picks the target language; the
 * result is stored as a language variant and reviewed before it goes out.
 */
export const translateRequestSchema = z.object({
  targetLang: z.enum(['de', 'en']),
});

const LANG_NAME: Record<OutputLang, string> = { de: 'German', en: 'English' };

/** The LLM returns the same {resume, letter} shape with the text values translated. */
export const translateResultSchema = z.object({
  resume: resumeSchema,
  letter: letterSchema,
});

/**
 * Build the prompt to translate the resume + cover letter into `target`. Only
 * the human-readable text is translated; structure, proper nouns (company and
 * people names), technology/skill names, dates, emails and URLs stay verbatim.
 */
export function translatePrompt(
  documents: TalentDocuments,
  target: OutputLang,
): { system: string; prompt: string } {
  const body = { resume: documents.resume, letter: documents.letter };
  return {
    system:
      `You are a professional translator for job-application documents. Translate ` +
      `every human-readable text value of the given JSON into ${LANG_NAME[target]}, ` +
      `preserving a natural, professional tone. Keep the JSON structure and keys ` +
      `identical. Do NOT translate: company names, people's names, product/technology ` +
      `and skill names, dates, periods, email addresses and URLs — copy them verbatim. ` +
      `Return ONLY valid JSON in exactly this shape (no explanation, no markdown ` +
      `fences): {"resume":{...},"letter":{...}}.`,
    prompt: `Translate this document set into ${LANG_NAME[target]}:\n"""\n${JSON.stringify(
      body,
    )}\n"""`,
  };
}
