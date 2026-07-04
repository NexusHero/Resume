import {
  type AtsScore,
  atsPrompt,
  atsResultSchema,
  fallbackAts,
  normalizeAts,
} from '../domain/ats-ai';
import type { LlmProviderId } from '../ports/llm-provider';
import { type CallUsage } from '../domain/usage';
import { MAX_TOKENS, type LlmFeatureRunner } from './llm-feature-runner';
import type { DocumentService } from './document-service';

export interface AtsAiServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  documentService: DocumentService;
}

/** Score a talent's résumé against a pasted job ad (ATS gap analysis). */
export class AtsAiService {
  private readonly runner: LlmFeatureRunner;
  private readonly documents: DocumentService;

  constructor(deps: AtsAiServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.documents = deps.documentService;
  }

  /**
   * Score the talent's résumé against a pasted job ad. The LLM returns a match
   * rate plus matched/missing keywords and concrete fixes; without a provider,
   * a deterministic keyword-overlap fallback keeps it usable.
   */
  async scoreAgainstJob(
    scope: string,
    userId: string,
    talentId: string,
    jobText: string,
  ): Promise<AtsScore & { provider: LlmProviderId | 'template'; usage?: CallUsage }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent

    const { content, provider, usage } = await this.runner.runFeature(
      userId,
      'ats',
      MAX_TOKENS.ats,
      atsPrompt(documents, jobText),
      {
        schema: atsResultSchema,
        normalize: normalizeAts,
        fallback: () => fallbackAts(documents, jobText),
      },
    );
    return { ...content, provider, usage };
  }
}
