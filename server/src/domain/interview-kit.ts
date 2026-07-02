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
  category: string; // e.g. Technical, Experience, Motivation, Culture
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
    resume.summary ? `Profile: ${resume.summary}` : '',
    roles.length ? `Roles: ${roles.join('; ')}` : '',
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
      'You are an experienced recruiter creating an interview guide for a ' +
      'conversation with a candidate about a specific mandate. Questions should be ' +
      'tailored to the profile and the role, fair and free of discrimination. Return ' +
      'EXCLUSIVELY valid JSON in exactly this schema (no explanation, no ' +
      'markdown fences): {"focus":"","questions":[{"category":"","question":"","lookFor":""}],' +
      '"scorecard":[""]}. focus = one line on what to pay particular attention to. questions = ' +
      '4–6 questions with a category and a "lookFor" (what a good answer shows). scorecard = ' +
      '3–6 evaluation criteria.',
    prompt:
      `Mandate: ${mandate.role}${mandate.client ? ` at ${mandate.client}` : ''}` +
      `${mandate.location ? `, ${mandate.location}` : ''}\n\nCandidate:\n${candidateFacts(documents)}`,
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
      category: 'Technical',
      question: `Describe a project in which you used ${skill}. What was your specific role?`,
      lookFor: 'Depth, concrete examples and personal contribution rather than general statements.',
    });
  }
  if (firstStation && (firstStation.role || firstStation.company)) {
    questions.push({
      category: 'Experience',
      question: `What was your biggest challenge as ${[firstStation.role, firstStation.company]
        .filter(Boolean)
        .join(' at ')} and how did you handle it?`,
      lookFor: 'Problem-solving, ownership and a measurable outcome.',
    });
  }
  questions.push({
    category: 'Motivation',
    question: `What appeals to you about the role of "${mandate.role}"${mandate.client ? ` at ${mandate.client}` : ''}?`,
    lookFor: 'A concrete connection to the role rather than generic phrases.',
  });
  questions.push({
    category: 'Culture',
    question: 'What does a work environment look like in which you do your best work?',
    lookFor: 'Self-awareness and fit with the team/client.',
  });

  const scorecard = [
    ...topSkills.map((s) => `Technical depth: ${s}`),
    `Suitability for "${mandate.role}"`,
    'Communication & clarity',
    'Motivation & fit',
  ];

  return {
    focus: matched.length
      ? `Assess technical depth in ${topSkills.join(', ')} as well as fit for the role.`
      : `Assess basic suitability for "${mandate.role}" and motivation in detail.`,
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
