import {
  type CandidateIdentity,
  type CoverLetterRequest,
  coverLetterPrompt,
  coverLetterTemplate,
} from '../domain/cover-letter';
import type { Logger } from '../ports/logger';
import type { LlmProviderId } from '../ports/llm-provider';
import type { LlmService } from './llm-service';

export interface CoverLetterResult {
  text: string;
  /** Which backend produced the text — 'template' when no LLM was available. */
  provider: LlmProviderId | 'template';
}

export interface CoverLetterServiceDeps {
  llmService: LlmService;
  candidate: CandidateIdentity;
  logger: Logger;
}

/**
 * Generates a tailored Anschreiben using the currently selected LLM provider,
 * falling back to a deterministic template whenever no provider is configured
 * or a call fails — so the feature always returns usable text.
 */
export class CoverLetterService {
  private readonly llm: LlmService;
  private readonly candidate: CandidateIdentity;
  private readonly logger: Logger;

  constructor(deps: CoverLetterServiceDeps) {
    this.llm = deps.llmService;
    this.candidate = deps.candidate;
    this.logger = deps.logger;
  }

  async generate(req: CoverLetterRequest): Promise<CoverLetterResult> {
    const provider = this.llm.active();
    if (provider) {
      try {
        const { system, prompt } = coverLetterPrompt(req, this.candidate);
        const text = await provider.generate({ system, prompt, maxTokens: 700 });
        return { text, provider: provider.id };
      } catch (err) {
        this.logger.warn(
          { provider: provider.id, err: err instanceof Error ? err.message : String(err) },
          'cover-letter generation failed, falling back to template',
        );
      }
    }
    return { text: coverLetterTemplate(req, this.candidate), provider: 'template' };
  }
}
