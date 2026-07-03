import {
  type CandidatePitch,
  pitchPrompt,
  pitchResultSchema,
  fallbackPitch,
  normalizePitch,
} from '../domain/candidate-pitch';
import {
  type OutreachMessage,
  type OutreachOptions,
  outreachPrompt,
  outreachResultSchema,
  fallbackOutreach,
  normalizeOutreach,
} from '../domain/outreach';
import { type GroundingReport, groundingSource } from '../domain/grounding';
import { detectLanguage } from '../domain/language';
import type { ArtifactKind } from '../domain/artifact';
import type { LlmProviderId } from '../ports/llm-provider';
import type { ArtifactLogRepository } from '../ports/artifact-log-repository';
import type { IdGenerator } from '../ports/id-generator';
import type { Clock } from '../ports/clock';
import type { Logger } from '../ports/logger';
import { type CallUsage } from '../domain/usage';
import { MAX_TOKENS, errMessage, type LlmFeatureRunner } from './llm-feature-runner';
import type { DocumentService } from './document-service';

export interface OutreachAiServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  documentService: DocumentService;
  artifactLogRepository: ArtifactLogRepository;
  idGenerator: IdGenerator;
  clock: Clock;
  logger: Logger;
}

/**
 * Client-facing generation that feeds the outcome loop (ADR-0014): the candidate
 * pitch and first-contact outreach. Each staged result is logged as an artifact
 * so reply rates can be tracked; both carry a grounding self-check.
 */
export class OutreachAiService {
  private readonly runner: LlmFeatureRunner;
  private readonly documents: DocumentService;
  private readonly artifacts: ArtifactLogRepository;
  private readonly ids: IdGenerator;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: OutreachAiServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.documents = deps.documentService;
    this.artifacts = deps.artifactLogRepository;
    this.ids = deps.idGenerator;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  /**
   * Log a client-facing artifact for the outcome loop (ADR-0014). Template
   * results are logged too — comparing template vs AI reply rates is the
   * point. Logging must never break the feature it observes.
   */
  private async logArtifact(
    scope: string,
    kind: ArtifactKind,
    talentId: string,
    provider: string,
    context: { channel?: string; audience?: string } = {},
  ): Promise<void> {
    try {
      await this.artifacts.add({
        id: this.ids.next(),
        ownerId: scope,
        kind,
        talentId,
        provider,
        channel: context.channel ?? '',
        audience: context.audience ?? '',
        outcome: 'pending',
        createdAt: this.clock.isoNow(),
      });
    } catch (err) {
      this.logger.warn({ kind, err: errMessage(err) }, 'artifact logging failed');
    }
  }

  /**
   * Draft a "why this candidate" short profile a recruiter presents to the
   * client, optionally tailored to a mandate/job context. The LLM returns a
   * headline, a few paragraphs and highlight bullets; without a provider, a
   * deterministic fallback assembles an honest profile from the talent's facts.
   */
  async pitchForMandate(
    scope: string,
    userId: string,
    talentId: string,
    mandateContext: string,
  ): Promise<
    CandidatePitch & {
      provider: LlmProviderId | 'template';
      grounding: GroundingReport;
      usage?: CallUsage;
    }
  > {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const source = groundingSource(documents, mandateContext);
    // Output language follows the job/mandate context, else the candidate's CV.
    const lang = detectLanguage(mandateContext.trim() || groundingSource(documents, ''));
    const grounded = (
      pitch: CandidatePitch,
      provider: LlmProviderId | 'template',
      usage?: CallUsage,
    ) =>
      this.runner.withGrounding(
        pitch,
        [pitch.headline, ...pitch.paragraphs].join(' '),
        source,
        provider,
        usage,
      );

    const res = await this.runner.run(
      userId,
      'pitch',
      MAX_TOKENS.pitch,
      pitchPrompt(documents, mandateContext, lang),
    );
    if (res) {
      const parsed = this.runner.parseReply('pitch', res.reply, pitchResultSchema);
      if (parsed) {
        const pitch = normalizePitch(parsed);
        if (pitch.headline || pitch.paragraphs.length) {
          await this.logArtifact(scope, 'pitch', talentId, res.provider);
          return grounded(pitch, res.provider, res.usage);
        }
      }
    }

    await this.logArtifact(scope, 'pitch', talentId, 'template');
    return grounded(fallbackPitch(documents, mandateContext, lang), 'template');
  }

  /**
   * Draft the first-contact outreach message for a talent — either to the
   * candidate directly (sourcing) or to a client (presenting the candidate),
   * as an email or a LinkedIn DM. The LLM returns {subject, body}; without a
   * provider, a deterministic fallback assembles a usable message.
   */
  async outreach(
    scope: string,
    userId: string,
    talentId: string,
    opts: OutreachOptions,
  ): Promise<
    OutreachMessage & {
      provider: LlmProviderId | 'template';
      grounding: GroundingReport;
      usage?: CallUsage;
    }
  > {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const source = groundingSource(documents, opts.mandateContext ?? '');
    // Output language follows the job/mandate context, else the candidate's CV.
    const lang = detectLanguage(
      (opts.mandateContext ?? '').trim() || groundingSource(documents, ''),
    );
    const grounded = (
      message: OutreachMessage,
      provider: LlmProviderId | 'template',
      usage?: CallUsage,
    ) =>
      this.runner.withGrounding(
        message,
        [message.subject, message.body].join(' '),
        source,
        provider,
        usage,
      );

    const res = await this.runner.run(
      userId,
      'outreach',
      MAX_TOKENS.outreach,
      outreachPrompt(documents, opts, lang),
    );
    const outreachContext = { channel: opts.channel, audience: opts.audience };
    if (res) {
      const parsed = this.runner.parseReply('outreach', res.reply, outreachResultSchema);
      if (parsed) {
        const message = normalizeOutreach(parsed, opts.channel);
        if (message.body) {
          await this.logArtifact(scope, 'outreach', talentId, res.provider, outreachContext);
          return grounded(message, res.provider, res.usage);
        }
      }
    }

    await this.logArtifact(scope, 'outreach', talentId, 'template', outreachContext);
    return grounded(fallbackOutreach(documents, opts, lang), 'template');
  }
}
