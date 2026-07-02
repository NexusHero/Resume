import {
  type DocumentAiAction,
  type DocumentAiTarget,
  summaryPrompt,
  letterPrompt,
  toParagraphs,
  fallbackSummary,
  fallbackLetter,
} from '../domain/document-ai';
import { parsePrompt, extractJson, fallbackParsed } from '../domain/document-parse';
import {
  type AtsScore,
  atsPrompt,
  atsResultSchema,
  fallbackAts,
  normalizeAts,
} from '../domain/ats-ai';
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
import { type GroundingReport, checkGrounding, groundingSource } from '../domain/grounding';
import { detectLanguage, type OutputLang } from '../domain/language';
import { translatePrompt, translateResultSchema } from '../domain/document-translate';
import { ValidationError } from '../domain/errors';
import {
  aggregateObservations,
  applyObserved,
  companyKeyOf,
} from '../domain/interview-observation';
import type { InterviewObservationRepository } from '../ports/interview-observation-repository';
import {
  type DocumentContact,
  type ResumeContent,
  type DocumentTranslation,
  saveDocumentsSchema,
} from '../domain/talent-documents';
import type { LlmProvider, LlmProviderId, TokenUsage } from '../ports/llm-provider';
import type { ApiKeyStore } from '../ports/api-key-store';
import type { PdfTextExtractor } from '../ports/pdf-text-extractor';
import type { UsageMeter } from '../ports/usage-meter';
import type { Clock } from '../ports/clock';
import type { Logger } from '../ports/logger';
import { type UsageFeature, toUsageEvent } from '../domain/usage';
import type { DocumentService } from './document-service';
import type { LlmService } from './llm-service';

export interface DocumentAiSuggestion {
  action: DocumentAiAction;
  /** Present for a summary suggestion. */
  text?: string;
  /** Present for a cover-letter suggestion. */
  paragraphs?: string[];
  /** Which backend produced it — 'template' when the deterministic fallback ran. */
  provider: LlmProviderId | 'template';
}

export interface ParsedDocument {
  contact: DocumentContact;
  resume: ResumeContent;
  provider: LlmProviderId | 'template';
}

/** A CV parsed from an uploaded PDF; `extractedChars` is 0 for a scanned PDF. */
export interface ParsedPdfDocument extends ParsedDocument {
  extractedChars: number;
}

export interface DocumentAiServiceDeps {
  documentService: DocumentService;
  llmService: LlmService;
  apiKeyStore: ApiKeyStore;
  pdfTextExtractor: PdfTextExtractor;
  usageMeter: UsageMeter;
  interviewObservationRepository: InterviewObservationRepository;
  clock: Clock;
  logger: Logger;
}

/**
 * AI assistance for the document editor: rewrite the resume summary or draft
 * cover-letter paragraphs from the talent's own facts, using the caller's
 * stored key for the current provider (falling back to the server credential,
 * then to a deterministic template — so it always returns usable text).
 */
export class DocumentAiService {
  private readonly documents: DocumentService;
  private readonly llm: LlmService;
  private readonly keys: ApiKeyStore;
  private readonly pdfText: PdfTextExtractor;
  private readonly usage: UsageMeter;
  private readonly observations: InterviewObservationRepository;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: DocumentAiServiceDeps) {
    this.documents = deps.documentService;
    this.llm = deps.llmService;
    this.keys = deps.apiKeyStore;
    this.pdfText = deps.pdfTextExtractor;
    this.usage = deps.usageMeter;
    this.observations = deps.interviewObservationRepository;
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
      this.logger.warn(
        { feature, err: err instanceof Error ? err.message : String(err) },
        'usage metering failed',
      );
    }
  }

  private async resolveProvider(
    ownerId: string,
  ): Promise<{ provider: LlmProvider; apiKey?: string } | null> {
    const currentId = this.llm.currentProvider();
    const current = this.llm.get(currentId);
    const apiKey = await this.keys.get(ownerId, currentId);
    if (current && apiKey) return { provider: current, apiKey };
    const active = this.llm.active(); // a provider with server credentials
    return active ? { provider: active } : null;
  }

  async suggest(
    scope: string,
    userId: string,
    talentId: string,
    action: DocumentAiAction,
    target: DocumentAiTarget = {},
  ): Promise<DocumentAiSuggestion> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(userId);

    if (resolved) {
      try {
        const { provider, apiKey } = resolved;
        const built =
          action === 'summary' ? summaryPrompt(documents) : letterPrompt(documents, target);
        const { text, usage } = await provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: action === 'summary' ? 300 : 700,
          ...(apiKey ? { apiKey } : {}),
        });
        await this.meter(userId, provider.id, 'suggest', usage);
        return action === 'summary'
          ? { action, text: text.trim(), provider: provider.id }
          : { action, paragraphs: toParagraphs(text), provider: provider.id };
      } catch (err) {
        this.logger.warn(
          { action, err: err instanceof Error ? err.message : String(err) },
          'AI document suggestion failed, falling back to template',
        );
      }
    }

    return action === 'summary'
      ? { action, text: fallbackSummary(documents), provider: 'template' }
      : { action, paragraphs: fallbackLetter(documents, target), provider: 'template' };
  }

  /**
   * Parse a pasted CV (plain text) into our structured contact + resume model.
   * Uses the LLM to extract JSON, validated against the documents schema; if no
   * provider is available or the reply is unusable, the raw text is kept as the
   * summary so nothing is lost.
   */
  async parse(
    scope: string,
    userId: string,
    talentId: string,
    text: string,
  ): Promise<ParsedDocument> {
    await this.documents.get(scope, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(userId);

    let raw: unknown = null;
    let provider: LlmProviderId | 'template' = 'template';
    if (resolved) {
      try {
        const built = parsePrompt(text);
        const { text: reply, usage } = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 1500,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        await this.meter(userId, resolved.provider.id, 'parse', usage);
        raw = extractJson(reply);
        if (raw) provider = resolved.provider.id;
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'CV parsing failed, falling back',
        );
      }
    }

    // Validate whatever we have (LLM JSON or fallback) through the save schema,
    // which fills defaults for any missing/invalid field.
    const source = (raw && typeof raw === 'object' ? raw : fallbackParsed(text)) as {
      contact?: unknown;
      resume?: unknown;
    };
    const validated = saveDocumentsSchema.parse({ contact: source.contact, resume: source.resume });
    return { contact: validated.contact, resume: validated.resume, provider };
  }

  /**
   * Parse a CV uploaded as a PDF: extract its text layer, then run the same
   * text-parsing path. A scanned/image-only PDF has no text (`extractedChars`
   * 0) — we return an empty structured set rather than call the LLM on nothing,
   * so the UI can prompt the user to paste the text instead.
   */
  async parsePdf(
    scope: string,
    userId: string,
    talentId: string,
    pdf: Buffer,
  ): Promise<ParsedPdfDocument> {
    await this.documents.get(scope, talentId); // 404s on unknown talent

    let text = '';
    try {
      text = await this.pdfText.extract(pdf);
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'PDF text extraction failed',
      );
    }

    if (!text.trim()) {
      const empty = saveDocumentsSchema.parse({});
      return {
        contact: empty.contact,
        resume: empty.resume,
        provider: 'template',
        extractedChars: 0,
      };
    }

    const parsed = await this.parse(scope, userId, talentId, text.slice(0, 50_000));
    return { ...parsed, extractedChars: text.length };
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
  ): Promise<AtsScore & { provider: LlmProviderId | 'template' }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(userId);

    if (resolved) {
      try {
        const built = atsPrompt(documents, jobText);
        const { text: reply, usage } = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 900,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        await this.meter(userId, resolved.provider.id, 'ats', usage);
        const json = extractJson(reply);
        const parsed = atsResultSchema.safeParse(json);
        if (parsed.success) return { ...normalizeAts(parsed.data), provider: resolved.provider.id };
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'ATS scoring failed, falling back',
        );
      }
    }

    return { ...fallbackAts(documents, jobText), provider: 'template' };
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
    CandidatePitch & { provider: LlmProviderId | 'template'; grounding: GroundingReport }
  > {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(userId);
    const source = groundingSource(documents, mandateContext);
    // Output language follows the job/mandate context, else the candidate's CV.
    const lang = detectLanguage(mandateContext.trim() || groundingSource(documents, ''));
    const withGrounding = <T extends CandidatePitch>(
      pitch: T,
      provider: LlmProviderId | 'template',
    ) => ({
      ...pitch,
      provider,
      grounding: checkGrounding([pitch.headline, ...pitch.paragraphs].join(' '), source),
    });

    if (resolved) {
      try {
        const built = pitchPrompt(documents, mandateContext, lang);
        const { text: reply, usage } = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 700,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        await this.meter(userId, resolved.provider.id, 'pitch', usage);
        const json = extractJson(reply);
        const parsed = pitchResultSchema.safeParse(json);
        if (parsed.success) {
          const pitch = normalizePitch(parsed.data);
          if (pitch.headline || pitch.paragraphs.length) {
            return withGrounding(pitch, resolved.provider.id);
          }
        }
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'candidate pitch failed, falling back',
        );
      }
    }

    return withGrounding(fallbackPitch(documents, mandateContext, lang), 'template');
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
    OutreachMessage & { provider: LlmProviderId | 'template'; grounding: GroundingReport }
  > {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(userId);
    const source = groundingSource(documents, opts.mandateContext ?? '');
    // Output language follows the job/mandate context, else the candidate's CV.
    const lang = detectLanguage(
      (opts.mandateContext ?? '').trim() || groundingSource(documents, ''),
    );
    const withGrounding = (message: OutreachMessage, provider: LlmProviderId | 'template') => ({
      ...message,
      provider,
      grounding: checkGrounding([message.subject, message.body].join(' '), source),
    });

    if (resolved) {
      try {
        const built = outreachPrompt(documents, opts, lang);
        const { text: reply, usage } = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 700,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        await this.meter(userId, resolved.provider.id, 'outreach', usage);
        const json = extractJson(reply);
        const parsed = outreachResultSchema.safeParse(json);
        if (parsed.success) {
          const message = normalizeOutreach(parsed.data, opts.channel);
          if (message.body) return withGrounding(message, resolved.provider.id);
        }
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'outreach draft failed, falling back',
        );
      }
    }

    return withGrounding(fallbackOutreach(documents, opts, lang), 'template');
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
  ): Promise<{ lang: OutputLang; translation: DocumentTranslation; created: boolean }> {
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

    const resolved = await this.resolveProvider(userId);
    if (!resolved) {
      throw new ValidationError(
        'Translation needs an AI provider. Add your Claude or Gemini key in Settings, then try again.',
      );
    }

    const built = translatePrompt(documents, targetLang);
    const { text, usage } = await resolved.provider.generate({
      system: built.system,
      prompt: built.prompt,
      maxTokens: 2000,
      ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
    });
    await this.meter(userId, resolved.provider.id, 'translate', usage);

    const parsed = translateResultSchema.safeParse(extractJson(text));
    if (!parsed.success) {
      throw new ValidationError('The translation could not be produced — please try again.');
    }

    const translation: DocumentTranslation = {
      resume: parsed.data.resume,
      letter: parsed.data.letter,
      provider: resolved.provider.id,
      updatedAt: this.clock.isoNow(),
    };
    await this.documents.saveTranslation(scope, talentId, targetLang, translation);
    return { lang: targetLang, translation, created: true };
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
  ): Promise<MatchExplanation & { provider: LlmProviderId | 'template' }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const matchedSkills = matchedForMandate(documents, mandate);
    const resolved = await this.resolveProvider(userId);

    if (resolved && documents) {
      try {
        const built = explainPrompt(documents, mandate, matchedSkills);
        const { text: reply, usage } = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 500,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        await this.meter(userId, resolved.provider.id, 'matchExplain', usage);
        const parsed = explanationResultSchema.safeParse(extractJson(reply));
        if (parsed.success) {
          const explanation = normalizeExplanation(parsed.data, matchedSkills);
          if (explanation.reasons.length) return { ...explanation, provider: resolved.provider.id };
        }
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'match explanation failed, falling back',
        );
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
  ): Promise<InterviewKit & { provider: LlmProviderId | 'template' }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(userId);

    if (resolved) {
      try {
        const built = interviewKitPrompt(documents, mandate);
        const { text: reply, usage } = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 900,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        await this.meter(userId, resolved.provider.id, 'interviewKit', usage);
        const parsed = interviewKitResultSchema.safeParse(extractJson(reply));
        if (parsed.success) {
          const kit = normalizeInterviewKit(parsed.data);
          if (kit.questions.length) return { ...kit, provider: resolved.provider.id };
        }
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'interview kit failed, falling back',
        );
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
  ): Promise<CandidatePrep & { provider: LlmProviderId | 'template' }> {
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
    const resolved = await this.resolveProvider(userId);

    if (resolved && documents) {
      try {
        const built = prepPrompt(documents, mandate, company, base.strengths);
        const { text: reply, usage } = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 1200,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        await this.meter(userId, resolved.provider.id, 'candidatePrep', usage);
        const parsed = prepResultSchema.safeParse(extractJson(reply));
        if (parsed.success) {
          return { ...mergePrep(base, parsed.data), provider: resolved.provider.id };
        }
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'candidate prep failed, falling back',
        );
      }
    }

    return { ...base, provider: 'template' };
  }
}
