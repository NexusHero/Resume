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
    .map((e) => [e.role, e.company].filter(Boolean).join(' bei '))
    .filter(Boolean);
  return {
    system:
      'Du bist Karriere-Coach und bereitest eine:n Bewerber:in auf ein konkretes ' +
      'Vorstellungsgespräch vor. Ziel: die Person bekommt den Job. Nutze NUR die gegebenen ' +
      'Fakten (Profil, Firmentyp, Anzeige) — erfinde nichts, keine erfundenen Firmen-Details. ' +
      'Gib AUSSCHLIESSLICH ' +
      'gültiges JSON in genau diesem Schema zurück (keine Markdown-Fences): ' +
      '{"likelyQuestions":[{"category":"","question":"","why":""}],"starAnswers":[{"competency":"",' +
      '"prompt":"","scaffold":""}],"candidateQuestions":[""]}. likelyQuestions = 4–6 erwartbare ' +
      'Fragen (passend zum Firmentyp/Format) mit kurzer Begründung. starAnswers = 2–3 Antwort-' +
      'Gerüste nach STAR, konkret aus den Stationen der Person. candidateQuestions = 3–4 kluge ' +
      'Rückfragen an das Unternehmen.',
    prompt:
      `Firmentyp: ${company.label} (Interview-Stil: ${company.style.formats.join('; ')})\n` +
      `Rolle: ${mandate.role}${mandate.client ? ` bei ${mandate.client}` : ''}\n` +
      `${strengths.length ? `Passende Stärken: ${strengths.join(', ')}\n` : ''}` +
      `Stationen: ${stations.join('; ') || '—'}\n` +
      `${documents.resume.summary ? `Profil: ${documents.resume.summary}` : ''}`,
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
      ? [firstStation.role, firstStation.company].filter(Boolean).join(' bei ')
      : 'einer deiner Stationen';

  const requirementChecks: RequirementCheck[] = requirements.musts.map((text) => ({
    text,
    covered: coveredByCv(text, skills),
  }));

  const likelyQuestions: PrepQuestion[] = [
    ...company.style.formats.slice(0, 3).map((f) => ({
      category: 'Format',
      question: `Rechne mit: ${f}.`,
      why: `typisch für ${company.label}`,
    })),
    ...topSkills.slice(0, 2).map((s) => ({
      category: 'Fachlich',
      question: `Vertiefe an einem konkreten Projekt deine Erfahrung mit ${s}.`,
      why: 'in Profil und Anzeige relevant',
    })),
    {
      category: 'Verhalten',
      question: `Nenne ein Beispiel, das „${company.style.emphasis[0] ?? 'deine Stärke'}" zeigt.`,
      why: `wird bei ${company.label} besonders gewichtet`,
    },
  ];

  const starAnswers: StarAnswer[] = [
    ...topSkills.slice(0, 1).map((s) => ({
      competency: s,
      prompt: `Erzähle von einem Projekt mit ${s}.`,
      scaffold: `Situation: deine Rolle bei ${stationLabel}. Aufgabe: das Ziel. Handlung: was DU konkret mit ${s} getan hast. Ergebnis: messbares Resultat.`,
    })),
    {
      competency: 'Herausforderung',
      prompt: 'Beschreibe eine schwierige Situation und wie du sie gelöst hast.',
      scaffold: `Situation: z. B. bei ${stationLabel}. Aufgabe: das Problem. Handlung: deine konkreten Schritte. Ergebnis: was am Ende besser war.`,
    },
  ];

  const candidateQuestions = [
    'Wie sieht Erfolg in dieser Rolle nach 6–12 Monaten aus?',
    'Wie ist das Team aufgestellt, mit dem ich zusammenarbeiten würde?',
    'Wie läuft das Onboarding in den ersten Wochen ab?',
    `Worauf legt ihr im Auswahlprozess besonders Wert (${company.style.emphasis[0] ?? 'Fachliches'})?`,
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
