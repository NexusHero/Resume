import { extractJson } from '../domain/document-parse.js';
import { type GroundingReport, checkGrounding } from '../domain/grounding.js';
import { AiNotConfiguredError, UpstreamProviderError } from '../domain/errors.js';
import { type CallUsage, type UsageFeature, callUsage, toUsageEvent } from '../domain/usage.js';
import type { LlmProvider, LlmProviderId, TokenUsage } from '../ports/llm-provider.js';
import type { UsageMeter } from '../ports/usage-meter.js';
import type { Clock } from '../ports/clock.js';
import type { Logger } from '../ports/logger.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { LlmService } from './llm-service.js';

/** Max output tokens per generation, sized to each feature's expected reply. */
export const MAX_TOKENS = {
  summary: 300,
  letter: 700,
  parse: 1500,
  ats: 900,
  pitch: 700,
  outreach: 700,
  translate: 2000,
  // Tailoring returns a tuned summary + a three-paragraph cover letter in one call.
  tailor: 1100,
  matchExplain: 500,
  interviewKit: 900,
  // Prep is the largest structured reply (4–6 questions with rationale, STAR
  // scaffolds, candidate questions); 1200 was regularly truncated mid-JSON.
  candidatePrep: 2000,
  // Posting extraction returns five short fields; 600 leaves ample headroom.
  postingExtract: 600,
  // A 250–400 word cover letter plus greeting/closing; 900 leaves headroom.
  applicationLetter: 900,
} as const;

/** A prompt pair produced by one of the domain prompt builders. */
export interface BuiltPrompt {
  system: string;
  prompt: string;
}

/** A resolved+metered generation. */
export interface LlmRun {
  reply: string;
  provider: LlmProviderId;
  usage: CallUsage;
}

/** A provider chosen for a caller. */
export interface ResolvedProvider {
  provider: LlmProvider;
}

/** The message of a caught error, whatever its type — for structured logs. */
export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface LlmFeatureRunnerDeps {
  llmService: LlmService;
  userRepository: UserRepository;
  usageMeter: UsageMeter;
  clock: Clock;
  logger: Logger;
}

/**
 * The shared LLM scaffold behind every AI feature (ADR-0005, reworked by
 * ADR-0057). Resolve the server's central provider, generate, meter the spend,
 * validate a JSON reply against its schema. There is **no template fallback**:
 * without a key it throws {@link AiNotConfiguredError}; a failed/unusable
 * generation throws {@link UpstreamProviderError}. The only fallback left in the
 * codebase is the deterministic, non-generative logic (matching, grounding,
 * AGG, ATS-gap), which does not go through this runner.
 */
export class LlmFeatureRunner {
  private readonly llm: LlmService;
  private readonly users: UserRepository;
  private readonly usage: UsageMeter;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: LlmFeatureRunnerDeps) {
    this.llm = deps.llmService;
    this.users = deps.userRepository;
    this.usage = deps.usageMeter;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  /**
   * Record what a generation cost against the caller's account. Metering must
   * never break the feature it measures, so a store failure is logged and
   * swallowed rather than propagated.
   */
  private async meter(
    userId: string,
    provider: LlmProviderId,
    feature: UsageFeature,
    usage: TokenUsage,
  ): Promise<void> {
    try {
      await this.usage.record(toUsageEvent(userId, provider, feature, usage, this.clock.isoNow()));
    } catch (err) {
      this.logger.warn({ feature, err: errMessage(err) }, 'usage metering failed');
    }
  }

  /**
   * The server's active provider (central key from env, ADR-0057). A missing key
   * is a hard error, never a template fallback.
   */
  async resolveProvider(userId: string): Promise<ResolvedProvider> {
    const stored = (await this.users.findById(userId))?.llmProvider;
    const provider = this.llm.resolve(stored);
    if (!provider) throw new AiNotConfiguredError();
    return { provider };
  }

  /**
   * Run one generation against the resolved provider and meter its token spend.
   * A generation failure is a real upstream error (502) — not a silent fallback.
   */
  async generateAndMeter(
    userId: string,
    feature: UsageFeature,
    maxTokens: number,
    built: BuiltPrompt,
    resolved: ResolvedProvider,
  ): Promise<LlmRun> {
    let result: { text: string; usage: TokenUsage };
    try {
      result = await resolved.provider.generate({
        system: built.system,
        prompt: built.prompt,
        maxTokens,
      });
    } catch (err) {
      this.logger.warn({ feature, err: errMessage(err) }, 'llm generation failed');
      throw new UpstreamProviderError();
    }
    await this.meter(userId, resolved.provider.id, feature, result.usage);
    return {
      reply: result.text,
      provider: resolved.provider.id,
      usage: callUsage(resolved.provider.id, result.usage),
    };
  }

  /** Resolve a provider, generate, meter. Throws on missing key / upstream failure. */
  async run(
    userId: string,
    feature: UsageFeature,
    maxTokens: number,
    built: BuiltPrompt,
  ): Promise<LlmRun> {
    const resolved = await this.resolveProvider(userId);
    return this.generateAndMeter(userId, feature, maxTokens, built, resolved);
  }

  /**
   * Validate a JSON-shaped LLM reply against its feature schema. A miss
   * (truncated output, malformed JSON, wrong shape) is an unusable upstream
   * result — 502, never a template.
   */
  parseReply<T>(
    feature: UsageFeature,
    reply: string,
    schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  ): T {
    const parsed = schema.safeParse(extractJson(reply));
    if (parsed.success) return parsed.data;
    this.logger.warn(
      { feature, replyChars: reply.length },
      'llm reply did not match the expected schema',
    );
    throw new UpstreamProviderError();
  }

  /**
   * The full "structured AI feature" path in one call: resolve → generate →
   * meter → schema-validate → normalize → guard. No deterministic fallback: a
   * missing key is 503, an unusable reply is 502. The caller passes only the
   * feature-specific pieces:
   *  - `schema`  — the reply's zod schema,
   *  - `normalize` — turns a validated reply into the feature's content type,
   *  - `accept` — an optional guard rejecting a technically-valid-but-empty
   *    result (e.g. no reasons, no questions) so it is reported as upstream.
   */
  async runFeature<P, T>(
    userId: string,
    feature: UsageFeature,
    maxTokens: number,
    built: BuiltPrompt,
    spec: {
      schema: { safeParse: (value: unknown) => { success: true; data: P } | { success: false } };
      normalize: (parsed: P) => T;
      accept?: (content: T) => boolean;
    },
  ): Promise<{ content: T; provider: LlmProviderId; usage?: CallUsage }> {
    const res = await this.run(userId, feature, maxTokens, built);
    const parsed = this.parseReply(feature, res.reply, spec.schema);
    const content = spec.normalize(parsed);
    if (spec.accept && !spec.accept(content)) {
      this.logger.warn({ feature }, 'llm reply was empty after normalization');
      throw new UpstreamProviderError();
    }
    return { content, provider: res.provider, usage: res.usage };
  }

  /**
   * Wrap a generated content object in the standard AI-response envelope: which
   * backend produced it, what the call cost, and a grounding self-check over the
   * supplied text against the CV+context source. Shared by every grounded
   * feature (pitch, outreach, tailoring) so the shape stays identical.
   */
  withGrounding<T>(
    content: T,
    groundedText: string,
    source: string,
    provider: LlmProviderId,
    usage?: CallUsage,
  ): T & { provider: LlmProviderId; usage?: CallUsage; grounding: GroundingReport } {
    return { ...content, provider, usage, grounding: checkGrounding(groundedText, source) };
  }
}
