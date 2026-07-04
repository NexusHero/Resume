import {
  type MandateContext,
  type MatchExplanation,
  explainPrompt,
  explanationResultSchema,
  fallbackExplanation,
  matchedForMandate,
  normalizeExplanation,
} from '../domain/match-explain';
import {
  type InterviewKit,
  interviewKitPrompt,
  interviewKitResultSchema,
  fallbackInterviewKit,
  normalizeInterviewKit,
} from '../domain/interview-kit';
import {
  type CandidatePrep,
  prepPrompt,
  prepResultSchema,
  fallbackPrep,
  mergePrep,
} from '../domain/candidate-prep';
import { companyInterviewProfile } from '../domain/company-archetype';
import { extractRequirements } from '../domain/job-requirements';
import {
  aggregateObservations,
  applyObserved,
  companyKeyOf,
} from '../domain/interview-observation';
import type { InterviewObservationRepository } from '../ports/interview-observation-repository';
import type { LlmProviderId } from '../ports/llm-provider';
import { type CallUsage } from '../domain/usage';
import { MAX_TOKENS, type LlmFeatureRunner } from './llm-feature-runner';
import type { DocumentService } from './document-service';

export interface MatchAiServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  documentService: DocumentService;
  interviewObservationRepository: InterviewObservationRepository;
}

/**
 * AI on top of a candidate↔mandate match: the "why they fit" explanation, the
 * interview kit, and the candidate-facing prep pack (blended with the first-party
 * observation flywheel, ADR-0006). All deterministic-fallback-backed.
 */
export class MatchAiService {
  private readonly runner: LlmFeatureRunner;
  private readonly documents: DocumentService;
  private readonly observations: InterviewObservationRepository;

  constructor(deps: MatchAiServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.documents = deps.documentService;
    this.observations = deps.interviewObservationRepository;
  }

  /**
   * Explain why a candidate fits a mandate — a short, grounded justification
   * shown next to the shortlist. The deterministic skill overlap is always
   * computed; the LLM turns it into readable reasons when available, otherwise
   * a template assembles honest reasons from the same facts.
   */
  async explainMatch(
    scope: string,
    userId: string,
    talentId: string,
    mandate: MandateContext,
  ): Promise<MatchExplanation & { provider: LlmProviderId | 'template'; usage?: CallUsage }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const matchedSkills = matchedForMandate(documents, mandate);

    const { content, provider, usage } = await this.runner.runFeature(
      userId,
      'matchExplain',
      MAX_TOKENS.matchExplain,
      explainPrompt(documents, mandate, matchedSkills),
      {
        schema: explanationResultSchema,
        normalize: (parsed) => normalizeExplanation(parsed, matchedSkills),
        accept: (explanation) => explanation.reasons.length > 0,
        fallback: () => fallbackExplanation(documents, mandate, matchedSkills),
      },
    );
    return { ...content, provider, usage };
  }

  /**
   * Build an interview kit (tailored questions + scorecard) for a candidate
   * against a mandate. LLM when available, deterministic template otherwise —
   * so the recruiter always walks in prepared.
   */
  async interviewKit(
    scope: string,
    userId: string,
    talentId: string,
    mandate: MandateContext,
  ): Promise<InterviewKit & { provider: LlmProviderId | 'template'; usage?: CallUsage }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent

    const { content, provider, usage } = await this.runner.runFeature(
      userId,
      'interviewKit',
      MAX_TOKENS.interviewKit,
      interviewKitPrompt(documents, mandate),
      {
        schema: interviewKitResultSchema,
        normalize: normalizeInterviewKit,
        accept: (kit) => kit.questions.length > 0,
        fallback: () => fallbackInterviewKit(documents, mandate),
      },
    );
    return { ...content, provider, usage };
  }

  /**
   * Candidate-facing interview preparation. The grounded parts (company style,
   * obligations from the ad, requirement coverage, matching strengths) are
   * computed deterministically; the LLM only refines the coaching narrative
   * (likely questions, STAR scaffolds, questions to ask). Falls back to a fully
   * deterministic pack when no provider is configured.
   */
  async candidatePrep(
    scope: string,
    userId: string,
    talentId: string,
    mandate: MandateContext,
    jobText: string,
  ): Promise<CandidatePrep & { provider: LlmProviderId | 'template'; usage?: CallUsage }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    // Blend real observations of this company over the archetype guess (flywheel).
    const observed = aggregateObservations(
      await this.observations.listForCompany(scope, companyKeyOf(mandate.client ?? '')),
    );
    const company = applyObserved(
      companyInterviewProfile(mandate.client ?? '', mandate.role, jobText),
      observed,
    );
    const requirements = extractRequirements(jobText);
    const base = fallbackPrep(documents, mandate, company, requirements, jobText);

    const { content, provider, usage } = await this.runner.runFeature(
      userId,
      'candidatePrep',
      MAX_TOKENS.candidatePrep,
      prepPrompt(documents, mandate, company, base.strengths),
      {
        schema: prepResultSchema,
        normalize: (parsed) => mergePrep(base, parsed),
        fallback: () => base,
      },
    );
    return { ...content, provider, usage };
  }
}
