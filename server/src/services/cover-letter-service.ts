import {
  type CandidateIdentity,
  type CoverLetterRequest,
  coverLetterPrompt,
} from '../domain/cover-letter.js';
import type { Logger } from '../ports/logger.js';
import type { LlmProviderId } from '../ports/llm-provider.js';
import type { UsageMeter } from '../ports/usage-meter.js';
import type { Clock } from '../ports/clock.js';
import { AiNotConfiguredError, UpstreamProviderError } from '../domain/errors.js';
import { toUsageEvent } from '../domain/usage.js';
import { detectLanguage } from '../domain/language.js';
import type { LlmService } from './llm-service.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface CoverLetterResult {
  text: string;
  /** Which backend produced the text. */
  provider: LlmProviderId;
}

export interface CoverLetterServiceDeps {
  llmService: LlmService;
  userRepository: UserRepository;
  candidate: CandidateIdentity;
  usageMeter: UsageMeter;
  clock: Clock;
  logger: Logger;
}

/**
 * Generates a tailored Anschreiben with the server's central LLM key (ADR-0057).
 * There is no template fallback: without a key it throws `AiNotConfiguredError`;
 * a failed upstream call throws `UpstreamProviderError`.
 */
export class CoverLetterService {
  private readonly llm: LlmService;
  private readonly users: UserRepository;
  private readonly candidate: CandidateIdentity;
  private readonly usage: UsageMeter;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: CoverLetterServiceDeps) {
    this.llm = deps.llmService;
    this.users = deps.userRepository;
    this.candidate = deps.candidate;
    this.usage = deps.usageMeter;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  /**
   * Generate a letter for the signed-in caller: resolve their stored provider
   * choice (only among providers with a server key), generate, meter.
   */
  async generate(req: CoverLetterRequest, userId: string): Promise<CoverLetterResult> {
    const stored = (await this.users.findById(userId))?.llmProvider;
    const provider = this.llm.resolve(stored);
    if (!provider) throw new AiNotConfiguredError();
    // The letter follows the posting's language; the request carries no free ad
    // text, so infer from the company/role/city/skills, defaulting to English.
    const lang = detectLanguage(
      [req.company, req.role, req.city ?? '', ...(req.skills ?? [])].join(' '),
    );
    const { system, prompt } = coverLetterPrompt(req, this.candidate, lang);
    let text: string;
    let usage: { inputTokens: number; outputTokens: number };
    try {
      ({ text, usage } = await provider.generate({ system, prompt, maxTokens: 700 }));
    } catch (err) {
      this.logger.warn(
        { provider: provider.id, err: err instanceof Error ? err.message : String(err) },
        'cover-letter generation failed',
      );
      throw new UpstreamProviderError();
    }
    try {
      await this.usage.record(
        toUsageEvent(userId, provider.id, 'coverLetter', usage, this.clock.isoNow()),
      );
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'usage metering failed',
      );
    }
    return { text, provider: provider.id };
  }
}
