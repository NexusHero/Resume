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

    const res = await this.runner.run(
      userId,
      'matchExplain',
      MAX_TOKENS.matchExplain,
      explainPrompt(documents, mandate, matchedSkills),
    );
    if (res) {
      const parsed = this.runner.parseReply('matchExplain', res.reply, explanationResultSchema);
      if (parsed) {
        const explanation = normalizeExplanation(parsed, matchedSkills);
        if (explanation.reasons.length) {
          return { ...explanation, provider: res.provider, usage: res.usage };
        }
      }
    }

    return { ...fallbackExplanation(documents, mandate, matchedSkills), provider: 'template' };
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

    const res = await this.runner.run(
      userId,
      'interviewKit',
      MAX_TOKENS.interviewKit,
      interviewKitPrompt(documents, mandate),
    );
    if (res) {
      const parsed = this.runner.parseReply('interviewKit', res.reply, interviewKitResultSchema);
      if (parsed) {
        const kit = normalizeInterviewKit(parsed);
        if (kit.questions.length) return { ...kit, provider: res.provider, usage: res.usage };
      }
    }

    return { ...fallbackInterviewKit(documents, mandate), provider: 'template' };
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

    const res = await this.runner.run(
      userId,
      'candidatePrep',
      MAX_TOKENS.candidatePrep,
      prepPrompt(documents, mandate, company, base.strengths),
    );
    if (res) {
      const parsed = this.runner.parseReply('candidatePrep', res.reply, prepResultSchema);
      if (parsed) {
        return { ...mergePrep(base, parsed), provider: res.provider, usage: res.usage };
      }
    }

    return { ...base, provider: 'template' };
  }
}
