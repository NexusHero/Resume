import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';
import { type MandateContext, documentSkills, matchedForMandate } from './match-explain';

/**
 * An interview kit for a candidate against a mandate: a handful of tailored
 * questions (each with what a strong answer looks like) plus a scorecard of
 * criteria to rate. The LLM writes it when available; a deterministic fallback
 * assembles a solid generic kit from the candidate's skills and the mandate, so
 * a recruiter always walks into the interview prepared.
 */
export interface InterviewQuestion {
  category: string; // e.g. Fachlich, Erfahrung, Motivation, Kultur
  question: string;
  lookFor: string; // what a strong answer demonstrates
}

export interface InterviewKit {
  focus: string; // one-line: what to probe most
  questions: InterviewQuestion[];
  scorecard: string[]; // criteria to rate the candidate on
}

/** The shape the LLM must return; validated leniently, then normalized. */
export const interviewKitResultSchema = z.object({
  focus: z.string().default(''),
  questions: z
    .array(
      z.object({
        category: z.string().default(''),
        question: z.string().default(''),
        lookFor: z.string().default(''),
      }),
    )
    .default([]),
  scorecard: z.array(z.string()).default([]),
});

function candidateFacts(documents: TalentDocuments): string {
  const { contact, resume } = documents;
  const roles = resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(' @ '))
    .filter(Boolean);
  return [
    contact.name ? `Name: ${contact.name}` : '',
    resume.summary ? `Profil: ${resume.summary}` : '',
    roles.length ? `Stationen: ${roles.join('; ')}` : '',
    documentSkills(documents).length ? `Skills: ${documentSkills(documents).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function interviewKitPrompt(
  documents: TalentDocuments,
  mandate: MandateContext,
): { system: string; prompt: string } {
  return {
    system:
      'Du bist erfahrene:r Personalberater:in und erstellst einen Interview-Leitfaden für ' +
      'ein Gespräch mit einer:einem Kandidat:in zu einem konkreten Mandat. Fragen sollen ' +
      'auf Profil und Stelle zugeschnitten sein, fair und ohne Diskriminierung. Gib ' +
      'AUSSCHLIESSLICH gültiges JSON in genau diesem Schema zurück (keine Erklärung, keine ' +
      'Markdown-Fences): {"focus":"","questions":[{"category":"","question":"","lookFor":""}],' +
      '"scorecard":[""]}. focus = eine Zeile, worauf besonders zu achten ist. questions = ' +
      '4–6 Fragen mit Kategorie und „lookFor" (was eine gute Antwort zeigt). scorecard = ' +
      '3–6 Bewertungskriterien.',
    prompt:
      `Mandat: ${mandate.role}${mandate.client ? ` bei ${mandate.client}` : ''}` +
      `${mandate.location ? `, ${mandate.location}` : ''}\n\nKandidat:\n${candidateFacts(documents)}`,
  };
}

/** Deterministic fallback: a solid generic kit from the candidate's own facts. */
export function fallbackInterviewKit(
  documents: TalentDocuments | null,
  mandate: MandateContext,
): InterviewKit {
  const skills = documentSkills(documents);
  const matched = matchedForMandate(documents, mandate);
  const topSkills = (matched.length ? matched : skills).slice(0, 3);
  const firstStation = documents?.resume.experience[0];

  const questions: InterviewQuestion[] = [];
  for (const skill of topSkills) {
    questions.push({
      category: 'Fachlich',
      question: `Beschreiben Sie ein Projekt, in dem Sie ${skill} eingesetzt haben. Was war Ihre konkrete Rolle?`,
      lookFor: 'Tiefe, konkrete Beispiele und eigener Beitrag statt allgemeiner Aussagen.',
    });
  }
  if (firstStation && (firstStation.role || firstStation.company)) {
    questions.push({
      category: 'Erfahrung',
      question: `Was war Ihre größte Herausforderung als ${[firstStation.role, firstStation.company]
        .filter(Boolean)
        .join(' bei ')} und wie sind Sie damit umgegangen?`,
      lookFor: 'Problemlösung, Eigenverantwortung und messbares Ergebnis.',
    });
  }
  questions.push({
    category: 'Motivation',
    question: `Was reizt Sie an der Rolle „${mandate.role}"${mandate.client ? ` bei ${mandate.client}` : ''}?`,
    lookFor: 'Konkreter Bezug zur Stelle statt allgemeiner Floskeln.',
  });
  questions.push({
    category: 'Kultur',
    question: 'Wie sieht ein Arbeitsumfeld aus, in dem Sie Ihre beste Leistung bringen?',
    lookFor: 'Selbstkenntnis und Passung zum Team/Kunden.',
  });

  const scorecard = [
    ...topSkills.map((s) => `Fachliche Tiefe: ${s}`),
    `Eignung für „${mandate.role}"`,
    'Kommunikation & Klarheit',
    'Motivation & Passung',
  ];

  return {
    focus: matched.length
      ? `Fachliche Tiefe in ${topSkills.join(', ')} sowie Passung zur Rolle prüfen.`
      : `Grundeignung für „${mandate.role}" und Motivation im Detail prüfen.`,
    questions,
    scorecard: scorecard.slice(0, 6),
  };
}

/** Trim/clamp an LLM kit into a clean InterviewKit. */
export function normalizeInterviewKit(raw: z.infer<typeof interviewKitResultSchema>): InterviewKit {
  const trim = (s: string) => s.replace(/\s+/g, ' ').trim();
  return {
    focus: trim(raw.focus),
    questions: raw.questions
      .map((q) => ({
        category: trim(q.category),
        question: trim(q.question),
        lookFor: trim(q.lookFor),
      }))
      .filter((q) => q.question)
      .slice(0, 6),
    scorecard: raw.scorecard.map(trim).filter(Boolean).slice(0, 6),
  };
}
