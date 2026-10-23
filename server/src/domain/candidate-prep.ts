import { z } from 'zod';
import { UpstreamProviderError } from './errors.js';
import type { TalentDocuments } from './talent-documents.js';
import { tokenize } from './ats-ai.js';
import { jobClusters, skillMatchesJob } from './skill-semantics.js';
import { documentSkills, type MandateContext } from './match-explain.js';
import type { CompanyProfile } from './company-archetype.js';
import type { JobRequirements } from './job-requirements.js';

/**
 * The candidate-facing preparation pack: the recruiter's way of helping the
 * applicant actually get the job. It fuses four grounded inputs — the CV, the
 * job ad's own requirements (Auflagen), the company's interview style
 * (archetype), and the CV↔ad skill overlap — into concrete prep. The factual
 * parts (style, obligations, requirement coverage, strengths) are computed by
 * us, never recalled by the LLM; the LLM only phrases the coaching narrative.
 */
export interface PrepQuestion {
  category: string;
  question: string;
  why: string;
}

export interface StarAnswer {
  competency: string;
  prompt: string; // the likely question
  scaffold: string; // a STAR skeleton grounded in the candidate's own station
}

export interface RequirementCheck {
  text: string; // a required item, quoted from the ad
  covered: boolean; // does the CV visibly evidence it?
}

export interface CandidatePrep {
  companyLabel: string;
  companySource: CompanyProfile['source'];
  companyConfidence: CompanyProfile['confidence'];
  formats: string[]; // interview formats to expect (the "Art und Weise")
  emphasis: string[];
  rounds: string;
  obligations: string[]; // Auflagen straight from the ad
  processHints: string[]; // process steps mentioned in the ad
  strengths: string[]; // CV skills the ad asks for → talking points
  requirementChecks: RequirementCheck[]; // musts, marked covered / to-verify
  likelyQuestions: PrepQuestion[];
  starAnswers: StarAnswer[];
  candidateQuestions: string[]; // smart questions for the candidate to ask
}

/** Does the CV visibly evidence a required line (semantic skill match)? */
function coveredByCv(line: string, skills: string[]): boolean {
  const tokens = tokenize(line);
  const clusters = jobClusters(tokens);
  return skills.some((s) => skillMatchesJob(s, tokens, clusters));
}

/** Skills the ad asks for that the CV shows (grounded strengths / talking points). */
function strengthsFromAd(documents: TalentDocuments | null, jobText: string): string[] {
  const tokens = tokenize(jobText);
  const clusters = jobClusters(tokens);
  return documentSkills(documents).filter((s) => skillMatchesJob(s, tokens, clusters));
}

/** The shape the LLM may refine; the grounded parts are never taken from it. */
export const prepResultSchema = z.object({
  likelyQuestions: z
    .array(
      z.object({
        category: z.string().default(''),
        question: z.string().default(''),
        why: z.string().default(''),
      }),
    )
    .default([]),
  starAnswers: z
    .array(
      z.object({
        competency: z.string().default(''),
        prompt: z.string().default(''),
        scaffold: z.string().default(''),
      }),
    )
    .default([]),
  candidateQuestions: z.array(z.string()).default([]),
});

export function prepPrompt(
  documents: TalentDocuments,
  mandate: MandateContext,
  company: CompanyProfile,
  strengths: string[],
): { system: string; prompt: string } {
  const stations = documents.resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(' at '))
    .filter(Boolean);
  return {
    system:
      'You are a career coach preparing an applicant for a specific ' +
      'job interview. Goal: the person gets the job. Use ONLY the given ' +
      'facts (profile, company type, ad) — invent nothing, no made-up company details. ' +
      'Return EXCLUSIVELY ' +
      'valid JSON in exactly this schema (no markdown fences): ' +
      '{"likelyQuestions":[{"category":"","question":"","why":""}],"starAnswers":[{"competency":"",' +
      '"prompt":"","scaffold":""}],"candidateQuestions":[""]}. likelyQuestions = 4–6 expected ' +
      'questions (fitting the company type/format) with a short rationale. starAnswers = 2–3 answer ' +
      "scaffolds using STAR, grounded in the person's own roles. candidateQuestions = 3–4 smart " +
      'questions to ask the company.',
    prompt:
      `Company type: ${company.label} (interview style: ${company.style.formats.join('; ')})\n` +
      `Role: ${mandate.role}${mandate.client ? ` at ${mandate.client}` : ''}\n` +
      `${strengths.length ? `Matching strengths: ${strengths.join(', ')}\n` : ''}` +
      `Roles: ${stations.join('; ') || '—'}\n` +
      `${documents.resume.summary ? `Profile: ${documents.resume.summary}` : ''}`,
  };
}

/** The factual, grounded part of a prep pack (the LLM writes only the narrative). */
export type CandidatePrepFacts = Omit<
  CandidatePrep,
  'likelyQuestions' | 'starAnswers' | 'candidateQuestions'
>;

/**
 * Facts for the prep prompt: company archetype/observations, obligations,
 * requirement coverage and strengths. Deterministic; no template coaching text.
 */
export function prepFacts(
  documents: TalentDocuments | null,
  company: CompanyProfile,
  requirements: JobRequirements,
  jobText: string,
): CandidatePrepFacts {
  const skills = documentSkills(documents);
  const strengths = strengthsFromAd(documents, jobText);
  const requirementChecks: RequirementCheck[] = requirements.musts.map((text) => ({
    text,
    covered: coveredByCv(text, skills),
  }));
  return {
    companyLabel: company.label,
    companySource: company.source,
    companyConfidence: company.confidence,
    formats: company.style.formats,
    emphasis: company.style.emphasis,
    rounds: company.style.rounds,
    obligations: requirements.obligations,
    processHints: requirements.processHints,
    strengths,
    requirementChecks,
  };
}

const trim = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Merge an LLM refinement into the deterministic base: the LLM may replace the
 * three narrative lists, but every grounded field (style, obligations, checks,
 * strengths) stays as computed — that is the anti-hallucination guarantee.
 */
export function mergePrep(
  facts: CandidatePrepFacts,
  raw: z.infer<typeof prepResultSchema>,
): CandidatePrep {
  const questions = raw.likelyQuestions
    .map((q) => ({ category: trim(q.category), question: trim(q.question), why: trim(q.why) }))
    .filter((q) => q.question)
    .slice(0, 6);
  const stars = raw.starAnswers
    .map((s) => ({
      competency: trim(s.competency),
      prompt: trim(s.prompt),
      scaffold: trim(s.scaffold),
    }))
    .filter((s) => s.scaffold)
    .slice(0, 3);
  const asks = raw.candidateQuestions.map(trim).filter(Boolean).slice(0, 4);
  // An empty required section means the model did not produce a usable pack —
  // an upstream error, never a silent fall back to template coaching text.
  if (!questions.length || !stars.length || !asks.length) {
    throw new UpstreamProviderError('The AI provider returned an incomplete interview prep.');
  }
  return {
    ...facts,
    likelyQuestions: questions,
    starAnswers: stars,
    candidateQuestions: asks,
  };
}
