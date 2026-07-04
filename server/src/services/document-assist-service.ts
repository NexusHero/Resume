import {
  type DocumentAiAction,
  type DocumentAiTarget,
  summaryPrompt,
  letterPrompt,
  toParagraphs,
  fallbackSummary,
  fallbackLetter,
} from '../domain/document-ai.js';
import {
  type TailorTarget,
  type TailoredApplication,
  tailorPrompt,
  tailorResultSchema,
  fallbackTailor,
  normalizeTailored,
} from '../domain/application-tailor.js';
import { extractJson } from '../domain/document-parse.js';
import { type GroundingReport, groundingSource } from '../domain/grounding.js';
import { detectLanguage, type OutputLang } from '../domain/language.js';
import { translatePrompt, translateResultSchema } from '../domain/document-translate.js';
import { ValidationError } from '../domain/errors.js';
import { type DocumentTranslation } from '../domain/talent-documents.js';
import type { LlmProviderId } from '../ports/llm-provider.js';
import type { Clock } from '../ports/clock.js';
import { type CallUsage } from '../domain/usage.js';
import { MAX_TOKENS, type LlmFeatureRunner } from './llm-feature-runner.js';
import type { DocumentService } from './document-service.js';

export interface DocumentAiSuggestion {
  action: DocumentAiAction;
  /** Present for a summary suggestion. */
  text?: string;
  /** Present for a cover-letter suggestion. */
  paragraphs?: string[];
  /** Which backend produced it — 'template' when the deterministic fallback ran. */
  provider: LlmProviderId | 'template';
  /** What this call cost — absent on a template result (nothing was spent). */
  usage?: CallUsage;
}

export interface DocumentAssistServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  documentService: DocumentService;
  clock: Clock;
}

/**
 * Generation of a talent's own documents: the editor's summary/letter rewrite,
 * the autopilot's ad-tailored application snapshot (ADR-0019), and full-document
 * translation. All go through the shared {@link LlmFeatureRunner}.
 */
export class DocumentAssistService {
  private readonly runner: LlmFeatureRunner;
  private readonly documents: DocumentService;
  private readonly clock: Clock;

  constructor(deps: DocumentAssistServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.documents = deps.documentService;
    this.clock = deps.clock;
  }

  async suggest(
    scope: string,
    userId: string,
    talentId: string,
    action: DocumentAiAction,
    target: DocumentAiTarget = {},
  ): Promise<DocumentAiSuggestion> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    // Output language follows the candidate's own documents (CV language).
    const lang = detectLanguage(groundingSource(documents, ''));
    const built =
      action === 'summary' ? summaryPrompt(documents, lang) : letterPrompt(documents, target, lang);
    const res = await this.runner.run(
      userId,
      'suggest',
      action === 'summary' ? MAX_TOKENS.summary : MAX_TOKENS.letter,
      built,
    );

    if (res) {
      return action === 'summary'
        ? { action, text: res.reply.trim(), provider: res.provider, usage: res.usage }
        : { action, paragraphs: toParagraphs(res.reply), provider: res.provider, usage: res.usage };
    }

    return action === 'summary'
      ? { action, text: fallbackSummary(documents, lang), provider: 'template' }
      : { action, paragraphs: fallbackLetter(documents, target, lang), provider: 'template' };
  }

  /**
   * Tailor a candidate's application to one job ad (ADR-0019): a résumé summary
   * tuned to the ad plus a cover-letter body, in the AD's language, in one call.
   * Returns a snapshot with provider/usage and a grounding check — it never
   * writes the candidate's stored documents. Degrades to a deterministic
   * template when no provider is configured.
   */
  async tailorForMandate(
    scope: string,
    userId: string,
    talentId: string,
    target: TailorTarget & { lang: OutputLang },
  ): Promise<
    TailoredApplication & {
      lang: OutputLang;
      provider: LlmProviderId | 'template';
      usage?: CallUsage;
      grounding: GroundingReport;
    }
  > {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const { content, provider, usage } = await this.runner.runFeature(
      userId,
      'tailor',
      MAX_TOKENS.tailor,
      tailorPrompt(documents, target, target.lang),
      {
        schema: tailorResultSchema,
        normalize: normalizeTailored,
        fallback: () => fallbackTailor(documents, target, target.lang),
      },
    );

    // Flag any claim the CV + ad don't support — trust matters most on autopilot.
    const grounded = this.runner.withGrounding(
      content,
      [content.summary, ...content.paragraphs].join('\n'),
      groundingSource(documents, target.jobText),
      provider,
      usage,
    );
    return { ...grounded, lang: target.lang };
  }

  /**
   * Translate a talent's documents (resume + cover letter) into `targetLang` and
   * store the result as a language variant. Idempotent: if a variant already
   * exists it is returned as-is (`created: false`). Unlike the other AI features
   * translation has no deterministic fallback — it requires a provider, so
   * without one a ValidationError asks the recruiter to add a key.
   */
  async translateDocuments(
    scope: string,
    userId: string,
    talentId: string,
    targetLang: OutputLang,
  ): Promise<{
    lang: OutputLang;
    translation: DocumentTranslation;
    created: boolean;
    usage?: CallUsage;
  }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent

    const sourceLang = detectLanguage(
      [documents.resume.summary, ...documents.resume.experience.flatMap((e) => e.bullets)].join(
        ' ',
      ),
    );
    if (targetLang === sourceLang) {
      throw new ValidationError(
        `The documents already read as ${targetLang === 'de' ? 'German' : 'English'}.`,
      );
    }

    const existing = documents.translations?.[targetLang];
    if (existing) return { lang: targetLang, translation: existing, created: false };

    const resolved = await this.runner.resolveProvider(userId);
    if (!resolved) {
      throw new ValidationError(
        'Translation needs an AI provider. Add your Claude or Gemini key in Settings, then try again.',
      );
    }

    // No fallback here: a generation failure propagates rather than degrading.
    const { reply, provider, usage } = await this.runner.generateAndMeter(
      userId,
      'translate',
      MAX_TOKENS.translate,
      translatePrompt(documents, targetLang),
      resolved,
    );

    const parsed = translateResultSchema.safeParse(extractJson(reply));
    if (!parsed.success) {
      throw new ValidationError('The translation could not be produced — please try again.');
    }

    const translation: DocumentTranslation = {
      resume: parsed.data.resume,
      letter: parsed.data.letter,
      provider,
      updatedAt: this.clock.isoNow(),
    };
    await this.documents.saveTranslation(scope, talentId, targetLang, translation);
    return { lang: targetLang, translation, created: true, usage };
  }
}
