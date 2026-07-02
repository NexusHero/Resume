import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';
import { candidateFacts } from './candidate-facts';
import type { OutputLang } from './language';

/** What the editor can ask the AI to (re)write. */
export type DocumentAiAction = 'summary' | 'letter';

/** POST /api/v1/talents/:id/documents/ai */
export const aiSuggestSchema = z.object({
  action: z.enum(['summary', 'letter']),
  role: z.string().optional(),
  company: z.string().optional(),
});

/** Optional targeting for a cover letter — the role/company it's aimed at. */
export interface DocumentAiTarget {
  role?: string;
  company?: string;
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
export function fallbackSummary(documents: TalentDocuments, lang: OutputLang = 'en'): string {
  const skills = documents.resume.skillGroups.flatMap((g) => g.items).slice(0, 4);
  if (lang === 'de') {
    const role = documents.contact.role || 'Fachkraft';
    const skillPart = skills.length ? ` mit Schwerpunkt auf ${skills.join(', ')}` : '';
    return `${role}${skillPart}. Erfahren in der praktischen Umsetzung anspruchsvoller Projekte, lösungsorientiert und teamstark.`;
  }
  const role = documents.contact.role || 'Professional';
  const skillPart = skills.length ? ` with a focus on ${skills.join(', ')}` : '';
  return `${role}${skillPart}. Experienced in delivering demanding projects in practice, solution-oriented and a strong team player.`;
}

export function fallbackLetter(
  documents: TalentDocuments,
  target: DocumentAiTarget = {},
  lang: OutputLang = 'en',
): string[] {
  const skills = documents.resume.skillGroups.flatMap((g) => g.items).slice(0, 3);
  if (lang === 'de') {
    const role = target.role || documents.contact.role;
    const position = role ? `die Stelle als ${role}` : 'die ausgeschriebene Stelle';
    const company = target.company ? ` bei ${target.company}` : '';
    return [
      `Mit großem Interesse bewerbe ich mich auf ${position}${company}. Mein Profil passt genau auf Ihre Anforderungen.`,
      `In meiner bisherigen Laufbahn habe ich${skills.length ? ` insbesondere mit ${skills.join(', ')} gearbeitet und dabei` : ''} überzeugende Ergebnisse erzielt und Verantwortung übernommen.`,
      'Über die Gelegenheit, meinen Beitrag zu Ihrem Team in einem persönlichen Gespräch zu erläutern, würde ich mich sehr freuen.',
    ];
  }
  const role = target.role || documents.contact.role || 'the advertised position';
  const company = target.company ? ` at ${target.company}` : '';
  return [
    `I am applying for ${role}${company} with great interest. My profile is a precise match for your requirements.`,
    `Throughout my career I have${skills.length ? ` worked in particular with ${skills.join(', ')} and` : ''} achieved convincing results and taken on responsibility.`,
    'I would welcome the opportunity to discuss my contribution to your team in a personal conversation.',
  ];
}
