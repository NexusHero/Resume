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
      'Du bist ein erfahrener Bewerbungscoach. Schreibe eine prägnante, überzeugende ' +
      'Kurzzusammenfassung (2–3 Sätze) für einen Lebenslauf auf Deutsch. Keine Floskeln, ' +
      'keine Ich-Form-Wiederholungen, keine erfundenen Fakten.',
    prompt: `Fakten zum Kandidaten:\n${facts(documents)}\n\nAktuelle Zusammenfassung:\n${
      documents.resume.summary || '(leer)'
    }\n\nGib nur die neue Zusammenfassung zurück.`,
  };
}

/** Prompt to write cover-letter paragraphs, optionally tailored to a role/company. */
export function letterPrompt(
  documents: TalentDocuments,
  target: DocumentAiTarget = {},
): { system: string; prompt: string } {
  const aim = [
    target.role ? `die Position „${target.role}"` : '',
    target.company ? `bei ${target.company}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    system:
      'Du bist ein erfahrener Bewerbungscoach. Schreibe den Fließtext eines deutschen ' +
      'Anschreibens als 3 Absätze (Einleitung, Kernkompetenzen, Abschluss). Nur die Absätze, ' +
      'ohne Anrede und Grußformel. Trenne die Absätze durch eine Leerzeile. Keine erfundenen Fakten.',
    prompt: `Fakten zum Kandidaten:\n${facts(documents)}\n\nZielposition: ${
      aim || '(nicht angegeben)'
    }\n\nGib nur die drei Absätze zurück.`,
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
  const role = documents.contact.role || 'Fachkraft';
  const skills = documents.resume.skillGroups.flatMap((g) => g.items).slice(0, 4);
  const skillPart = skills.length ? ` mit Schwerpunkten in ${skills.join(', ')}` : '';
  return `${role}${skillPart}. Erfahren in der praktischen Umsetzung anspruchsvoller Projekte, lösungsorientiert und teamfähig.`;
}

export function fallbackLetter(
  documents: TalentDocuments,
  target: DocumentAiTarget = {},
): string[] {
  const role = target.role || documents.contact.role || 'die ausgeschriebene Position';
  const company = target.company ? ` bei ${target.company}` : '';
  const skills = documents.resume.skillGroups.flatMap((g) => g.items).slice(0, 3);
  return [
    `mit großem Interesse bewerbe ich mich auf ${role}${company}. Mein Profil passt genau zu Ihren Anforderungen.`,
    `In meiner bisherigen Laufbahn habe ich${skills.length ? ` insbesondere mit ${skills.join(', ')}` : ''} überzeugende Ergebnisse erzielt und Verantwortung übernommen.`,
    'Gerne überzeuge ich Sie in einem persönlichen Gespräch von meinem Beitrag zu Ihrem Team.',
  ];
}
