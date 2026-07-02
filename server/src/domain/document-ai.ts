import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';

/** What the editor can ask the AI to (re)write. */
export type DocumentAiAction = 'summary' | 'letter';

/** POST /api/v1/talents/:id/documents/ai */
export const aiSuggestSchema = z.object({
  action: z.enum(['summary', 'letter']),
  role: z.string().optional(),
  company: z.string().optional(),
});
export type AiSuggestInput = z.infer<typeof aiSuggestSchema>;

/** Optional targeting for a cover letter — the role/company it's aimed at. */
export interface DocumentAiTarget {
  role?: string;
  company?: string;
}

function facts(documents: TalentDocuments): string {
  const { contact, resume } = documents;
  const roles = resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(' @ '))
    .filter(Boolean);
  const skills = resume.skillGroups.flatMap((g) => g.items);
  return [
    contact.role ? `Role: ${contact.role}` : '',
    roles.length ? `Experience: ${roles.join('; ')}` : '',
    skills.length ? `Skills: ${skills.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Prompt to rewrite the resume summary from the talent's own facts. */
export function summaryPrompt(documents: TalentDocuments): { system: string; prompt: string } {
  return {
    system:
      'You are an experienced career coach. Write a concise, compelling ' +
      'summary (2–3 sentences) for a resume. No clichés, ' +
      'no repeated first-person phrasing, no invented facts.',
    prompt: `Candidate facts:\n${facts(documents)}\n\nCurrent summary:\n${
      documents.resume.summary || '(empty)'
    }\n\nReturn only the new summary.`,
  };
}

/** Prompt to write cover-letter paragraphs, optionally tailored to a role/company. */
export function letterPrompt(
  documents: TalentDocuments,
  target: DocumentAiTarget = {},
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
      'without salutation or sign-off. Separate the paragraphs with a blank line. No invented facts.',
    prompt: `Candidate facts:\n${facts(documents)}\n\nTarget position: ${
      aim || '(not specified)'
    }\n\nReturn only the three paragraphs.`,
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

/**
 * Deterministic fallbacks — used when no LLM provider is available (no user key
 * and no server credentials), so the feature always returns usable text.
 */
export function fallbackSummary(documents: TalentDocuments): string {
  const role = documents.contact.role || 'Professional';
  const skills = documents.resume.skillGroups.flatMap((g) => g.items).slice(0, 4);
  const skillPart = skills.length ? ` with a focus on ${skills.join(', ')}` : '';
  return `${role}${skillPart}. Experienced in delivering demanding projects in practice, solution-oriented and a strong team player.`;
}

export function fallbackLetter(
  documents: TalentDocuments,
  target: DocumentAiTarget = {},
): string[] {
  const role = target.role || documents.contact.role || 'the advertised position';
  const company = target.company ? ` at ${target.company}` : '';
  const skills = documents.resume.skillGroups.flatMap((g) => g.items).slice(0, 3);
  return [
    `I am applying for ${role}${company} with great interest. My profile is a precise match for your requirements.`,
    `Throughout my career I have${skills.length ? ` worked in particular with ${skills.join(', ')} and` : ''} achieved convincing results and taken on responsibility.`,
    'I would welcome the opportunity to discuss my contribution to your team in a personal conversation.',
  ];
}
