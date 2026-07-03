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
import type { UserRepository } from '../ports/user-repository';
import type { PdfTextExtractor } from '../ports/pdf-text-extractor';
import type { UsageMeter } from '../ports/usage-meter';
import type { Clock } from '../ports/clock';
import type { Logger } from '../ports/logger';
import { type CallUsage, type UsageFeature, callUsage, toUsageEvent } from '../domain/usage';
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
  /** What this call cost — absent on a template result (nothing was spent). */
  usage?: CallUsage;
}

export interface ParsedDocument {
  contact: DocumentContact;
  resume: ResumeContent;
  provider: LlmProviderId | 'template';
  usage?: CallUsage;
}

/** A CV parsed from an uploaded PDF; `extractedChars` is 0 for a scanned PDF. */
export interface ParsedPdfDocument extends ParsedDocument {
  extractedChars: number;
}

export interface DocumentAiServiceDeps {
  documentService: DocumentService;
  llmService: LlmService;
  apiKeyStore: ApiKeyStore;
  userRepository: UserRepository;
  pdfTextExtractor: PdfTextExtractor;
  usageMeter: UsageMeter;
  interviewObservationRepository: InterviewObservationRepository;
  clock: Clock;
  logger: Logger;
}

/** A prompt pair produced by one of the domain prompt builders. */
interface BuiltPrompt {
  system: string;
  prompt: string;
}

/** Max output tokens per generation, sized to each feature's expected reply. */
const MAX_TOKENS = {
  summary: 300,
  letter: 700,
  parse: 1500,
  ats: 900,
  pitch: 700,
  outreach: 700,
  translate: 2000,
  matchExplain: 500,
  interviewKit: 900,
  // Prep is the largest structured reply (4–6 questions with rationale, STAR
  // scaffolds, candidate questions); 1200 was regularly truncated mid-JSON.
  candidatePrep: 2000,
} as const;

/**
 * Home of all document AI features: suggest (summary/letter rewrite), CV parse
 * (text + PDF), ATS scoring, candidate pitch, outreach drafts, translation,
 * match explanations, interview kits and candidate prep. Every feature resolves
 * the caller's stored key for the current provider (falling back to the server
 * credential), meters token spend against the caller, and — except translation,
 * which requires a provider — degrades to a deterministic template so it always
 * returns a usable result.
 */
export class DocumentAiService {
  private readonly documents: DocumentService;
  private readonly llm: LlmService;
  private readonly keys: ApiKeyStore;
  private readonly users: UserRepository;
  private readonly pdfText: PdfTextExtractor;
  private readonly usage: UsageMeter;
  private readonly observations: InterviewObservationRepository;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: DocumentAiServiceDeps) {
    this.documents = deps.documentService;
    this.llm = deps.llmService;
    this.keys = deps.apiKeyStore;
    this.users = deps.userRepository;
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
    userId: string,
  ): Promise<{ provider: LlmProvider; apiKey?: string } | null> {
    // The user's persisted choice wins (it survives restarts and is not shared
    // across the team); without one, the server's configured default applies.
    const stored = (await this.users.findById(userId))?.llmProvider;
    const currentId = stored && this.llm.get(stored) ? stored : this.llm.currentProvider();
    const current = this.llm.get(currentId);
    const apiKey = await this.keys.get(userId, currentId);
    if (current && apiKey) return { provider: current, apiKey };
    const active = this.llm.active(); // a provider with server credentials
    return active ? { provider: active } : null;
  }

  /**
   * Run one generation against a resolved provider (forwarding the caller's
   * key when present) and meter its token spend. Generation failures propagate
   * to the caller; metering swallows its own errors (see {@link meter}).
   */
  private async generateAndMeter(
    userId: string,
    feature: UsageFeature,
    maxTokens: number,
    built: BuiltPrompt,
    resolved: { provider: LlmProvider; apiKey?: string },
  ): Promise<{ reply: string; provider: LlmProviderId; usage: CallUsage }> {
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
   * The shared LLM scaffold behind every feature with a deterministic
   * fallback: resolve a provider, generate, meter. Returns null when no
   * provider is available or the generation fails (logged), so the caller can
   * fall back to its template.
   */
  private async runLlm(
    userId: string,
    feature: UsageFeature,
    maxTokens: number,
    built: BuiltPrompt,
  ): Promise<{ reply: string; provider: LlmProviderId; usage: CallUsage } | null> {
    const resolved = await this.resolveProvider(userId);
    if (!resolved) return null;
    try {
      return await this.generateAndMeter(userId, feature, maxTokens, built, resolved);
    } catch (err) {
      this.logger.warn(
        { feature, err: err instanceof Error ? err.message : String(err) },
        'llm generation failed, falling back',
      );
      return null;
    }
  }

  /**
   * Validate a JSON-shaped LLM reply against its feature schema. A miss
   * (truncated output, malformed JSON, wrong shape) must be visible in the
   * logs — otherwise the template fallback is indistinguishable from a
   * missing provider.
   */
  private parseReply<T>(
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
    const res = await this.runLlm(
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

    const res = await this.runLlm(userId, 'parse', MAX_TOKENS.parse, parsePrompt(text));
    const raw: unknown = res ? extractJson(res.reply) : null;
    const provider: LlmProviderId | 'template' = res && raw ? res.provider : 'template';
    const usage = res && raw ? res.usage : undefined;

    // Validate whatever we have (LLM JSON or fallback) through the save schema,
    // which fills defaults for any missing/invalid field.
    const source = (raw && typeof raw === 'object' ? raw : fallbackParsed(text)) as {
      contact?: unknown;
      resume?: unknown;
    };
    const validated = saveDocumentsSchema.parse({ contact: source.contact, resume: source.resume });
    return { contact: validated.contact, resume: validated.resume, provider, usage };
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
  ): Promise<AtsScore & { provider: LlmProviderId | 'template'; usage?: CallUsage }> {
    const documents = await this.documents.get(scope, talentId); // 404s on unknown talent

    const res = await this.runLlm(userId, 'ats', MAX_TOKENS.ats, atsPrompt(documents, jobText));
    if (res) {
      const parsed = this.parseReply('ats', res.reply, atsResultSchema);
      if (parsed) return { ...normalizeAts(parsed), provider: res.provider, usage: res.usage };
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
    const withGrounding = <T extends CandidatePitch>(
      pitch: T,
      provider: LlmProviderId | 'template',
      usage?: CallUsage,
    ) => ({
      ...pitch,
      provider,
      usage,
      grounding: checkGrounding([pitch.headline, ...pitch.paragraphs].join(' '), source),
    });

    const res = await this.runLlm(
      userId,
      'pitch',
      MAX_TOKENS.pitch,
      pitchPrompt(documents, mandateContext, lang),
    );
    if (res) {
      const parsed = this.parseReply('pitch', res.reply, pitchResultSchema);
      if (parsed) {
        const pitch = normalizePitch(parsed);
        if (pitch.headline || pitch.paragraphs.length) {
          return withGrounding(pitch, res.provider, res.usage);
        }
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
    const withGrounding = (
      message: OutreachMessage,
      provider: LlmProviderId | 'template',
      usage?: CallUsage,
    ) => ({
      ...message,
      provider,
      usage,
      grounding: checkGrounding([message.subject, message.body].join(' '), source),
    });

    const res = await this.runLlm(
      userId,
      'outreach',
      MAX_TOKENS.outreach,
      outreachPrompt(documents, opts, lang),
    );
    if (res) {
      const parsed = this.parseReply('outreach', res.reply, outreachResultSchema);
      if (parsed) {
        const message = normalizeOutreach(parsed, opts.channel);
        if (message.body) return withGrounding(message, res.provider, res.usage);
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

    const resolved = await this.resolveProvider(userId);
    if (!resolved) {
      throw new ValidationError(
        'Translation needs an AI provider. Add your Claude or Gemini key in Settings, then try again.',
      );
    }

    // No fallback here: a generation failure propagates rather than degrading.
    const { reply, provider, usage } = await this.generateAndMeter(
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

    const res = await this.runLlm(
      userId,
      'matchExplain',
      MAX_TOKENS.matchExplain,
      explainPrompt(documents, mandate, matchedSkills),
    );
    if (res) {
      const parsed = this.parseReply('matchExplain', res.reply, explanationResultSchema);
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

    const res = await this.runLlm(
      userId,
      'interviewKit',
      MAX_TOKENS.interviewKit,
      interviewKitPrompt(documents, mandate),
    );
    if (res) {
      const parsed = this.parseReply('interviewKit', res.reply, interviewKitResultSchema);
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

    const res = await this.runLlm(
      userId,
      'candidatePrep',
      MAX_TOKENS.candidatePrep,
      prepPrompt(documents, mandate, company, base.strengths),
    );
    if (res) {
      const parsed = this.parseReply('candidatePrep', res.reply, prepResultSchema);
      if (parsed) {
        return { ...mergePrep(base, parsed), provider: res.provider, usage: res.usage };
      }
    }

    return { ...base, provider: 'template' };
  }
}
