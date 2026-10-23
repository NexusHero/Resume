import { z } from 'zod';
import type { TalentDocuments } from './talent-documents.js';
import type { MandateContext } from './match-explain.js';
import { candidateFacts } from './candidate-facts.js';

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
