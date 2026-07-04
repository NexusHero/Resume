import { extractJson } from '../domain/document-parse';
import { type GroundingReport, checkGrounding } from '../domain/grounding';
import { type CallUsage, type UsageFeature, callUsage, toUsageEvent } from '../domain/usage';
import type { LlmProvider, LlmProviderId, TokenUsage } from '../ports/llm-provider';
import type { ApiKeyStore } from '../ports/api-key-store';
import type { UserRepository } from '../ports/user-repository';
import type { UsageMeter } from '../ports/usage-meter';
import type { Clock } from '../ports/clock';
import type { Logger } from '../ports/logger';
import type { LlmService } from './llm-service';

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

/** A provider chosen for a caller, with the key (user's own or none → server). */
export interface ResolvedProvider {
  provider: LlmProvider;
  apiKey?: string;
}

/** The message of a caught error, whatever its type — for structured logs. */
export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface LlmFeatureRunnerDeps {
  llmService: LlmService;
  apiKeyStore: ApiKeyStore;
  userRepository: UserRepository;
  usageMeter: UsageMeter;
  clock: Clock;
  logger: Logger;
}

/**
 * The shared LLM scaffold behind every AI feature with a deterministic fallback
 * (ADR-0005): resolve the caller's provider, generate, meter the spend, validate
 * a JSON reply against its schema, and attach the standard grounded envelope.
 * Extracted from the former DocumentAiService so each feature service owns only
 * its own orchestration (ADR-0022); the metering/fallback/grounding logic lives
 * here, once.
 */
export class LlmFeatureRunner {
  private readonly llm: LlmService;
  private readonly keys: ApiKeyStore;
  private readonly users: UserRepository;
  private readonly usage: UsageMeter;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: LlmFeatureRunnerDeps) {
    this.llm = deps.llmService;
    this.keys = deps.apiKeyStore;
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
   * The provider for a caller: their persisted choice + stored key wins
   * (ADR-0011); without a user key, a server-credentialed provider; else null.
   */
  async resolveProvider(userId: string): Promise<ResolvedProvider | null> {
    const stored = (await this.users.findById(userId))?.llmProvider;
    const currentId = stored && this.llm.get(stored) ? stored : this.llm.currentProvider();
    const current = this.llm.get(currentId);
    const apiKey = await this.keys.get(userId, currentId);
    if (current && apiKey) return { provider: current, apiKey };
    const active = this.llm.active(); // a provider with server credentials
    return active ? { provider: active } : null;
  }

  /**
   * Run one generation against a resolved provider (forwarding the caller's key
   * when present) and meter its token spend. Generation failures propagate to
   * the caller; metering swallows its own errors.
   */
  async generateAndMeter(
    userId: string,
    feature: UsageFeature,
    maxTokens: number,
    built: BuiltPrompt,
    resolved: ResolvedProvider,
  ): Promise<LlmRun> {
    const { text, usage } = await resolved.provider.generate({
      system: built.system,
      prompt: built.prompt,
      maxTokens,
      ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
    });
    await this.meter(userId, resolved.provider.id, feature, usage);
    return {
      reply: text,
      provider: resolved.provider.id,
      usage: callUsage(resolved.provider.id, usage),
    };
  }

  /**
   * Resolve a provider, generate, meter. Returns null when no provider is
   * available or the generation fails (logged), so the caller falls back to its
   * deterministic template.
   */
  async run(
    userId: string,
    feature: UsageFeature,
    maxTokens: number,
    built: BuiltPrompt,
  ): Promise<LlmRun | null> {
    const resolved = await this.resolveProvider(userId);
    if (!resolved) return null;
    try {
      return await this.generateAndMeter(userId, feature, maxTokens, built, resolved);
    } catch (err) {
      this.logger.warn({ feature, err: errMessage(err) }, 'llm generation failed, falling back');
      return null;
    }
  }

  /**
   * Validate a JSON-shaped LLM reply against its feature schema. A miss
   * (truncated output, malformed JSON, wrong shape) is logged so the template
   * fallback is not indistinguishable from a missing provider.
   */
  parseReply<T>(
    feature: UsageFeature,
    reply: string,
    schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  ): T | null {
    const parsed = schema.safeParse(extractJson(reply));
    if (parsed.success) return parsed.data;
    this.logger.warn(
      { feature, replyChars: reply.length },
      'llm reply did not match the expected schema, falling back',
    );
    return null;
  }

  /**
   * The full "structured AI feature" path in one call: resolve → generate →
   * meter → schema-validate → normalize → guard, with a deterministic fallback.
   * Every JSON-shaped feature (ATS, explain, kit, prep, pitch, outreach, tailor)
   * shared this exact block; it now lives here once. The caller passes only the
   * feature-specific pieces:
   *  - `schema`  — the reply's zod schema,
   *  - `normalize` — turns a validated reply into the feature's content type,
   *  - `accept` — an optional guard rejecting a technically-valid-but-empty
   *    result (e.g. no reasons, no questions) so it falls back instead,
   *  - `fallback` — the deterministic template content.
   * Returns the content plus which backend produced it and the call usage
   * (`provider: 'template'`, no usage, when the fallback ran).
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
      fallback: () => T;
    },
  ): Promise<{ content: T; provider: LlmProviderId | 'template'; usage?: CallUsage }> {
    const res = await this.run(userId, feature, maxTokens, built);
    if (res) {
      const parsed = this.parseReply(feature, res.reply, spec.schema);
      if (parsed) {
        const content = spec.normalize(parsed);
        if (!spec.accept || spec.accept(content)) {
          return { content, provider: res.provider, usage: res.usage };
        }
      }
    }
    return { content: spec.fallback(), provider: 'template' };
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
    provider: LlmProviderId | 'template',
    usage?: CallUsage,
  ): T & { provider: LlmProviderId | 'template'; usage?: CallUsage; grounding: GroundingReport } {
    return { ...content, provider, usage, grounding: checkGrounding(groundedText, source) };
  }
}
