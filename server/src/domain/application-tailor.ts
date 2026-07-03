import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';
import { candidateFacts } from './candidate-facts';
import { fallbackSummary, fallbackLetter } from './document-ai';
import type { OutputLang } from './language';

/**
 * Tailoring a candidate's application to one job ad (ADR-0019): from the
 * candidate's real facts and the ad, produce a résumé summary tuned to the ad
 * plus a cover-letter body — in the AD's language, in a single LLM call. The
 * result is a snapshot the auto-apply agent stores on its draft; it is NEVER
 * written back over the candidate's canonical documents. Deterministic
 * template fallback so it works offline like the rest of DocumentAiService.
 */
export interface TailorTarget {
  role: string;
  company: string;
  /** The employer's ad text — the tailoring context. */
  jobText: string;
}

/** The tuned application content — a snapshot, not persisted to the CV. */
export interface TailoredApplication {
  /** A résumé summary tuned to the ad (2–3 sentences). */
  summary: string;
  /** Cover-letter body paragraphs (no salutation / sign-off). */
  paragraphs: string[];
}

export const tailorResultSchema = z.object({
  summary: z.string(),
  paragraphs: z.array(z.string()),
});

/** Clean an LLM (or fallback) result: trimmed summary, non-empty trimmed paragraphs. */
export function normalizeTailored(raw: TailoredApplication): TailoredApplication {
  return {
    summary: raw.summary.replace(/\s+/g, ' ').trim(),
    paragraphs: raw.paragraphs.map((p) => p.trim()).filter(Boolean),
  };
}

/** One prompt returning both the tuned summary and the cover-letter body, in the ad's language. */
export function tailorPrompt(
  documents: TalentDocuments,
  target: TailorTarget,
  lang: OutputLang = 'en',
): { system: string; prompt: string } {
  const de = lang === 'de';
  return {
    system:
      'You are an experienced career coach preparing a job application. From the ' +
      "candidate's real facts and the job ad, write (1) a concise résumé summary " +
      '(2–3 sentences) tuned to the ad, and (2) a cover-letter body of three ' +
      'paragraphs (introduction, core competencies, closing) with no salutation ' +
      'or sign-off. Never invent facts, degrees, employers or numbers — use only ' +
      'what the candidate facts support. Return ONLY minified JSON of the shape ' +
      '{"summary": string, "paragraphs": [string, string, string]}.' +
      (de
        ? ' Schreibe summary und paragraphs ausschließlich auf Deutsch.'
        : ' Write summary and paragraphs in English only.'),
    prompt:
      `Candidate facts:\n${candidateFacts(documents)}\n\n` +
      `Job ad — "${target.role}"${target.company ? ` at ${target.company}` : ''}:\n"""\n` +
      `${target.jobText.slice(0, 6000) || '(no ad text provided)'}\n"""`,
  };
}

/** Deterministic fallback when no provider is available — reuses the editor's fallbacks. */
export function fallbackTailor(
  documents: TalentDocuments,
  target: TailorTarget,
  lang: OutputLang = 'en',
): TailoredApplication {
  return {
    summary: fallbackSummary(documents, lang),
    paragraphs: fallbackLetter(documents, { role: target.role, company: target.company }, lang),
  };
}
