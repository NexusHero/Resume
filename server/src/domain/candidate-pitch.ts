import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';
import type { OutputLang } from './language';

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
    contact.role ? `Role: ${contact.role}` : '',
    resume.summary ? `Profile: ${resume.summary}` : '',
    roles.length ? `Experience: ${roles.join('; ')}` : '',
    skills.length ? `Skills: ${skills.join(', ')}` : '',
    education.length ? `Education: ${education.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function pitchPrompt(
  documents: TalentDocuments,
  mandateContext: string,
  lang: OutputLang = 'en',
): { system: string; prompt: string } {
  const system =
    'You are a recruitment consultant writing a short candidate profile that you ' +
    'present to the client (the mandate) — persuasive, credible, free of empty phrases ' +
    'and without inventing facts. Return ONLY valid JSON in exactly this schema (no ' +
    'explanation, no Markdown fences): ' +
    '{"headline":"","paragraphs":["",""],"highlights":["",""]}. ' +
    'headline = one concise line "why this candidate". paragraphs = 2–3 short ' +
    'paragraphs on suitability. highlights = 3–5 bullet-point strengths.' +
    (lang === 'de' ? ' Antworte ausschließlich auf Deutsch.' : ' Respond in English only.');
  return {
    system,
    prompt: `Candidate:\n${candidateFacts(documents)}\n\nMandate/role context:\n"""\n${
      mandateContext || '(not provided — general profile)'
    }\n"""`,
  };
}

/**
 * Deterministic fallback (no LLM): assemble an honest short profile straight
 * from the talent's own facts, so the feature always returns something usable.
 */
export function fallbackPitch(
  documents: TalentDocuments,
  mandateContext: string,
  lang: OutputLang = 'en',
): CandidatePitch {
  const { contact, resume } = documents;
  const de = lang === 'de';
  const name = contact.name || (de ? 'Der:die Kandidat:in' : 'The candidate');
  const role = contact.role || resume.experience[0]?.role || (de ? 'Fachkraft' : 'professional');
  const skills = resume.skillGroups.flatMap((g) => g.items);
  const stations = resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(de ? ' bei ' : ' at '))
    .filter(Boolean);

  const headline = de
    ? `${name} — ${role}${skills.length ? ` mit Schwerpunkt ${skills.slice(0, 3).join(', ')}` : ''}`
    : `${name} — ${role}${
        skills.length ? ` with a focus on ${skills.slice(0, 3).join(', ')}` : ''
      }`;

  const paragraphs = de
    ? [
        resume.summary ||
          `${name} bringt als ${role} fundierte Erfahrung mit und überzeugt durch lösungsorientiertes, verlässliches Arbeiten.`,
        stations.length
          ? `Relevante Stationen: ${stations.slice(0, 3).join('; ')}.`
          : `${name} hat in der bisherigen Laufbahn Verantwortung übernommen und Projekte erfolgreich umgesetzt.`,
      ]
    : [
        resume.summary ||
          `${name} brings solid experience as a ${role} and stands out through solution-oriented, dependable work.`,
        stations.length
          ? `Relevant roles: ${stations.slice(0, 3).join('; ')}.`
          : `${name} has taken on responsibility throughout their career and delivered projects successfully.`,
      ];
  if (mandateContext.trim()) {
    paragraphs.push(
      de
        ? 'Das Profil passt gut zum vorliegenden Mandat; im Gespräch lassen sich die relevanten Kompetenzen gezielt vertiefen.'
        : 'The profile is a strong fit for this mandate; the relevant competencies can be explored in more depth during an interview.',
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
