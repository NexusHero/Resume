import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';

/**
 * POST /api/v1/talents/:id/documents/pitch — an optional mandate/job context to
 * tailor the pitch. Empty context still yields a general "why this candidate"
 * profile from the talent's own facts.
 */
export const pitchRequestSchema = z.object({
  mandateContext: z.string().max(50_000).default(''),
});
export type PitchRequestInput = z.infer<typeof pitchRequestSchema>;

/** A short "why this candidate" profile a recruiter presents to a client. */
export interface CandidatePitch {
  headline: string; // one-line hook
  paragraphs: string[]; // 2–3 short paragraphs
  highlights: string[]; // 3–5 bullet strengths
}

/** The shape the LLM must return; validated leniently, then normalized. */
export const pitchResultSchema = z.object({
  headline: z.string().default(''),
  paragraphs: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
});

function candidateFacts(documents: TalentDocuments): string {
  const { contact, resume } = documents;
  const roles = resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(' @ '))
    .filter(Boolean);
  const skills = resume.skillGroups.flatMap((g) => g.items);
  const education = resume.education
    .map((e) => [e.degree, e.school].filter(Boolean).join(', '))
    .filter(Boolean);
  return [
    contact.name ? `Name: ${contact.name}` : '',
    contact.role ? `Rolle: ${contact.role}` : '',
    resume.summary ? `Profil: ${resume.summary}` : '',
    roles.length ? `Stationen: ${roles.join('; ')}` : '',
    skills.length ? `Skills: ${skills.join(', ')}` : '',
    education.length ? `Ausbildung: ${education.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function pitchPrompt(
  documents: TalentDocuments,
  mandateContext: string,
): { system: string; prompt: string } {
  return {
    system:
      'Du bist Personalberater:in und schreibst ein Kandidaten-Kurzprofil, das du dem ' +
      'Kunden (dem Mandat) vorlegst — überzeugend, seriös, ohne Floskeln und ohne erfundene ' +
      'Fakten. Gib AUSSCHLIESSLICH gültiges JSON in genau diesem Schema zurück (keine ' +
      'Erklärung, keine Markdown-Fences): ' +
      '{"headline":"","paragraphs":["",""],"highlights":["",""]}. ' +
      'headline = eine prägnante Zeile „Warum diese:r Kandidat:in". paragraphs = 2–3 kurze ' +
      'Absätze zur Eignung. highlights = 3–5 stichpunktartige Stärken.',
    prompt: `Kandidat:\n${candidateFacts(documents)}\n\nMandat/Stellenkontext:\n"""\n${
      mandateContext || '(nicht angegeben — allgemeines Kurzprofil)'
    }\n"""`,
  };
}

/**
 * Deterministic fallback (no LLM): assemble an honest short profile straight
 * from the talent's own facts, so the feature always returns something usable.
 */
export function fallbackPitch(documents: TalentDocuments, mandateContext: string): CandidatePitch {
  const { contact, resume } = documents;
  const name = contact.name || 'Der:die Kandidat:in';
  const role = contact.role || resume.experience[0]?.role || 'Fachkraft';
  const skills = resume.skillGroups.flatMap((g) => g.items);
  const stations = resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(' bei '))
    .filter(Boolean);

  const headline = `${name} — ${role}${
    skills.length ? ` mit Schwerpunkt ${skills.slice(0, 3).join(', ')}` : ''
  }`;

  const paragraphs = [
    resume.summary ||
      `${name} bringt als ${role} fundierte Erfahrung mit und überzeugt durch lösungsorientiertes, verlässliches Arbeiten.`,
    stations.length
      ? `Relevante Stationen: ${stations.slice(0, 3).join('; ')}.`
      : `${name} hat in der bisherigen Laufbahn Verantwortung übernommen und Projekte erfolgreich umgesetzt.`,
  ];
  if (mandateContext.trim()) {
    paragraphs.push(
      'Das Profil passt gut zum vorliegenden Mandat; im Gespräch lassen sich die relevanten Kompetenzen gezielt vertiefen.',
    );
  }

  const highlights = [
    ...skills.slice(0, 4),
    ...(resume.education[0]?.degree ? [resume.education[0].degree] : []),
  ].slice(0, 5);

  return { headline, paragraphs, highlights };
}

/** Trim/clamp an LLM-produced pitch into a clean CandidatePitch. */
export function normalizePitch(raw: z.infer<typeof pitchResultSchema>): CandidatePitch {
  const clean = (list: string[], max: number): string[] =>
    list
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, max);
  return {
    headline: raw.headline.replace(/\s+/g, ' ').trim(),
    paragraphs: clean(raw.paragraphs, 3),
    highlights: clean(raw.highlights, 5),
  };
}
