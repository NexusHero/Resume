import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';
import { tokenize } from './ats-ai';
import { jobClusters, skillMatchesJob } from './skill-semantics';
import { documentSkills, type MandateContext } from './match-explain';
import type { CompanyProfile } from './company-archetype';
import type { JobRequirements } from './job-requirements';

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

/** Deterministic prep — grounded, always available, no LLM. */
export function fallbackPrep(
  documents: TalentDocuments | null,
  mandate: MandateContext,
  company: CompanyProfile,
  requirements: JobRequirements,
  jobText: string,
): CandidatePrep {
  const skills = documentSkills(documents);
  const strengths = strengthsFromAd(documents, jobText);
  const topSkills = (strengths.length ? strengths : skills).slice(0, 3);
  const firstStation = documents?.resume.experience[0];
  const stationLabel =
    firstStation && (firstStation.role || firstStation.company)
      ? [firstStation.role, firstStation.company].filter(Boolean).join(' at ')
      : 'one of your roles';

  const requirementChecks: RequirementCheck[] = requirements.musts.map((text) => ({
    text,
    covered: coveredByCv(text, skills),
  }));

  const likelyQuestions: PrepQuestion[] = [
    ...company.style.formats.slice(0, 3).map((f) => ({
      category: 'Format',
      question: `Expect: ${f}.`,
      why: `typical for ${company.label}`,
    })),
    ...topSkills.slice(0, 2).map((s) => ({
      category: 'Technical',
      question: `Go deep on your experience with ${s} using a concrete project.`,
      why: 'relevant in both profile and ad',
    })),
    {
      category: 'Behavior',
      question: `Give an example that demonstrates "${company.style.emphasis[0] ?? 'your strength'}".`,
      why: `weighted particularly heavily at ${company.label}`,
    },
  ];

  const starAnswers: StarAnswer[] = [
    ...topSkills.slice(0, 1).map((s) => ({
      competency: s,
      prompt: `Tell us about a project involving ${s}.`,
      scaffold: `Situation: your role at ${stationLabel}. Task: the goal. Action: what YOU specifically did with ${s}. Result: a measurable outcome.`,
    })),
    {
      competency: 'Challenge',
      prompt: 'Describe a difficult situation and how you resolved it.',
      scaffold: `Situation: e.g. at ${stationLabel}. Task: the problem. Action: your concrete steps. Result: what was better in the end.`,
    },
  ];

  const candidateQuestions = [
    'What does success in this role look like after 6–12 months?',
    "How is the team I'd be working with set up?",
    'What does onboarding look like in the first few weeks?',
    `What do you value most in the selection process (${company.style.emphasis[0] ?? 'technical skills'})?`,
  ];

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
    likelyQuestions,
    starAnswers,
    candidateQuestions,
  };
}

const trim = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Merge an LLM refinement into the deterministic base: the LLM may replace the
 * three narrative lists, but every grounded field (style, obligations, checks,
 * strengths) stays as computed — that is the anti-hallucination guarantee.
 */
export function mergePrep(
  base: CandidatePrep,
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
  return {
    ...base,
    likelyQuestions: questions.length ? questions : base.likelyQuestions,
    starAnswers: stars.length ? stars : base.starAnswers,
    candidateQuestions: asks.length ? asks : base.candidateQuestions,
  };
}
