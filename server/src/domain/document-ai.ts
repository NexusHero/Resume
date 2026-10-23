import { z } from 'zod';
import type { TalentDocuments } from './talent-documents.js';
import { candidateFacts } from './candidate-facts.js';
import type { OutputLang } from './language.js';

/** What the editor can ask the AI to (re)write. */
export type DocumentAiAction = 'summary' | 'letter';

/** POST /api/v1/talents/:id/documents/ai */
export const aiSuggestSchema = z.object({
  action: z.enum(['summary', 'letter']),
  role: z.string().optional(),
  company: z.string().optional(),
  jobText: z.string().optional(),
});

/** Optional targeting for a cover letter — the role/company it's aimed at. */
export interface DocumentAiTarget {
  role?: string;
  company?: string;
  jobText?: string;
}

/** Prompt to rewrite the resume summary from the talent's own facts. */
export function summaryPrompt(
  documents: TalentDocuments,
  lang: OutputLang = 'en',
): { system: string; prompt: string } {
  return {
    system:
      'You are an experienced career coach. Write a concise, compelling ' +
      'summary (2–3 sentences) for a resume. No clichés, ' +
      'no repeated first-person phrasing, no invented facts.' +
      (lang === 'de' ? ' Antworte ausschließlich auf Deutsch.' : ' Respond in English only.'),
    prompt: `Candidate facts:\n${candidateFacts(documents)}\n\nCurrent summary:\n${
      documents.resume.summary || '(empty)'
    }\n\nReturn only the new summary.`,
  };
}

/** Prompt to write cover-letter paragraphs, optionally tailored to a role/company. */
export function letterPrompt(
  documents: TalentDocuments,
  target: DocumentAiTarget = {},
  lang: OutputLang = 'en',
): { system: string; prompt: string } {
  const aim = [
    target.role ? `the "${target.role}" position` : '',
    target.company ? `at ${target.company}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    system:
      'You are an experienced career coach. Write the body of a cover ' +
      'letter as 3 paragraphs (introduction, core competencies, closing). Only the paragraphs, ' +
      'without salutation or sign-off. Separate the paragraphs with a blank line. No invented facts.' +
      (lang === 'de' ? ' Antworte ausschließlich auf Deutsch.' : ' Respond in English only.'),
    prompt: `Candidate facts:\n${candidateFacts(documents)}\n\nTarget position: ${
      aim || '(not specified)'
    }\n\n${target.jobText ? `Job ad description:\n${target.jobText}\n\n` : ''}Return only the three paragraphs.`,
  };
}

/** Split an LLM completion into non-empty paragraphs. */
export function toParagraphs(text: string): string[] {
  const parts = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return parts.length ? parts : [text.trim()].filter(Boolean);
}
