import {
  PEN_RESULT_SCHEMAS,
  penAccept,
  penGroundedText,
  penPrompt,
  normalizePen,
  type PenAllEntry,
  type PenAllResult,
  type PenContent,
  type PenLetterSuggestion,
  type PenParsed,
  type PenSection,
  type PenSuggestion,
} from '../domain/magic-pen.js';
import { DomainError, NotFoundError, ValidationError } from '../domain/errors.js';
import { detectLanguage } from '../domain/language.js';
import { groundingSource, type GroundingReport } from '../domain/grounding.js';
import type { TalentDocuments } from '../domain/talent-documents.js';
import type { CallUsage } from '../domain/usage.js';
import { MAX_TOKENS, type LlmFeatureRunner } from './llm-feature-runner.js';
import type { ApplicationLetterService } from './application-letter-service.js';
import type { JobApplicationRepository } from '../ports/job-application-repository.js';
import type { JobPostingRepository } from '../ports/job-posting-repository.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { LlmProviderId } from '../ports/llm-provider.js';

export interface MagicPenServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  jobApplicationRepository: JobApplicationRepository;
  jobPostingRepository: JobPostingRepository;
  documentRepository: DocumentRepository;
  applicationLetterService: ApplicationLetterService;
}

/** Which metered feature each CV section runs under (AK-3.6). */
const SECTION_FEATURE = {
  headline: 'penHeadline',
  summary: 'penSummary',
  experienceBullets: 'penExperienceBullets',
  skills: 'penSkills',
} as const;

/**
 * The Magic Pen (ADR-0060): per-section, grounded rewriting of a job
 * application's document **copy**. It never writes — every call loads the copy,
 * the base CV (grounding source), and the ad text, runs one metered generation
 * through the shared {@link LlmFeatureRunner}, and returns a before/after
 * {@link PenSuggestion}. Acceptance is the caller's existing autosave
 * (`PUT /job-applications/:id/documents`), so there is no base-CV write path.
 */
export class MagicPenService {
  private readonly runner: LlmFeatureRunner;
  private readonly applications: JobApplicationRepository;
  private readonly postings: JobPostingRepository;
  private readonly documents: DocumentRepository;
  private readonly letterService: ApplicationLetterService;

  constructor(deps: MagicPenServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.applications = deps.jobApplicationRepository;
    this.postings = deps.jobPostingRepository;
    this.documents = deps.documentRepository;
    this.letterService = deps.applicationLetterService;
  }

  /**
   * Load the application and resolve the CV-section grounding source. The four
   * CV sections ground against the **base CV** (ADR-0060 §2), falling back to
   * the copy when the tenant was deleted (best effort). The ad text is lazy —
   * empty when the posting is gone, so the language falls back to German.
   */
  private async context(scope: string, applicationId: string) {
    const application = await this.applications.findById(scope, applicationId);
    if (!application) throw new NotFoundError(`Job application ${applicationId} not found`);
    const copy = application.documents;
    const base = await this.documents.get(scope, application.talentId);
    const groundingDocs = base ?? copy;
    const posting = await this.postings.findById(scope, application.jobPostingId);
    const adText = posting?.description ?? '';
    return { application, copy, groundingDocs, adText, lang: detectLanguage(adText) };
  }

  /** The copy field a section maps to (its "before" value). */
  private beforeValue(section: PenSection, copy: TalentDocuments, experienceIndex = 0): PenContent {
    switch (section) {
      case 'headline':
        return copy.contact.role;
      case 'summary':
        return copy.resume.summary;
      case 'experienceBullets':
        // The index is validated against `experience.length` before this runs,
        // so the station is always present here (never a silent empty list).
        return copy.resume.experience[experienceIndex]!.bullets;
      case 'skills':
        return copy.resume.skillGroups;
    }
  }

  /**
   * Rewrite one section of the copy. Grounding runs against the base CV (not the
   * copy) so a previously accepted fabrication is re-flagged on the next pass;
   * the suggestion is returned, never persisted.
   */
  async rewriteSection(
    scope: string,
    userId: string,
    applicationId: string,
    section: PenSection,
    opts: { experienceIndex?: number } = {},
  ): Promise<PenSuggestion> {
    const { application, copy, groundingDocs, adText, lang } = await this.context(
      scope,
      applicationId,
    );

    let experienceIndex: number | undefined;
    if (section === 'experienceBullets') {
      experienceIndex = opts.experienceIndex ?? 0;
      if (experienceIndex >= copy.resume.experience.length) {
        throw new ValidationError(`experienceIndex ${experienceIndex} is out of range`);
      }
    }

    const feature = SECTION_FEATURE[section];
    const before = this.beforeValue(section, copy, experienceIndex);

    const { content, provider, usage } = await this.runner.runFeature(
      userId,
      feature,
      MAX_TOKENS[feature],
      penPrompt(section, { adText, documents: copy, experienceIndex, lang }),
      {
        schema: PEN_RESULT_SCHEMAS[section] as {
          safeParse: (value: unknown) => { success: true; data: PenParsed } | { success: false };
        },
        normalize: (parsed: PenParsed) => normalizePen(section, parsed),
        accept: (c: PenContent) => penAccept(section, c),
      },
    );

    // The `withGrounding` helper spreads its content argument, so the raw
    // string/array content is wrapped to attach provider/usage/grounding cleanly.
    const grounded = this.runner.withGrounding(
      { after: content },
      penGroundedText(section, content),
      groundingSource(groundingDocs),
      provider,
      usage,
    );

    const suggestion: PenSuggestion = {
      section,
      before,
      after: grounded.after,
      provider: grounded.provider,
      usage: grounded.usage,
      grounding: grounded.grounding,
    };
    if (section === 'experienceBullets' && experienceIndex !== undefined) {
      // The index was validated above, so the station exists.
      const station = copy.resume.experience[experienceIndex]!;
      suggestion.experienceIndex = experienceIndex;
      suggestion.station = {
        role: station.role,
        company: station.company,
        period: station.period,
      };
    }
    return suggestion;
  }

  /** The letter slot of `pen/all`: reuses the application-letter generation (ADR-0060 §5). */
  private async letterSlot(
    scope: string,
    userId: string,
    applicationId: string,
    copy: TalentDocuments,
  ): Promise<PenLetterSuggestion> {
    const { letter } = await this.letterService.generate(scope, userId, applicationId);
    return {
      section: 'letter',
      before: copy.letter.absaetze,
      after: letter.paragraphs,
      provider: letter.provider as LlmProviderId,
      usage: letter.usage as CallUsage | undefined,
      grounding: letter.grounding as GroundingReport,
      checks: letter.checks,
    };
  }

  /**
   * "Alles anpassen" (AK-3.5): the four CV sections plus the letter slot, one
   * metered call each, fanned out with `allSettled`. A failed section becomes an
   * error slot so the rest of the aggregate stays usable — never a whole-request
   * 500. `experienceBullets` produces one entry **per station** (§3.2).
   */
  async rewriteAll(scope: string, userId: string, applicationId: string): Promise<PenAllResult> {
    const { copy } = await this.context(scope, applicationId);
    const tasks: Array<Promise<PenAllEntry>> = [
      this.rewriteSection(scope, userId, applicationId, 'headline'),
      this.rewriteSection(scope, userId, applicationId, 'summary'),
      ...copy.resume.experience.map((_, i) =>
        this.rewriteSection(scope, userId, applicationId, 'experienceBullets', {
          experienceIndex: i,
        }),
      ),
      this.rewriteSection(scope, userId, applicationId, 'skills'),
      this.letterSlot(scope, userId, applicationId, copy),
    ];

    const settled = await Promise.allSettled(tasks);
    const sections: PenAllEntry[] = settled.map((r) =>
      r.status === 'fulfilled' ? r.value : this.errorSlot(r.reason),
    );
    return { sections };
  }

  /** Fold a rejected section into the `{ error: { type, detail } }` slot shape. */
  private errorSlot(reason: unknown): PenAllEntry {
    if (reason instanceof DomainError) {
      return { error: { type: reason.type, detail: reason.message } };
    }
    return {
      error: {
        type: 'internal-error',
        detail: reason instanceof Error ? reason.message : String(reason),
      },
    };
  }
}
