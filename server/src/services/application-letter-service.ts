import {
  applicationLetterPrompt,
  applicationLetterResultSchema,
  checkApplicationLetter,
  type ApplicationLetterResult,
} from '../domain/application-letter.js';
import { NotFoundError } from '../domain/errors.js';
import { detectLanguage } from '../domain/language.js';
import { groundingSource } from '../domain/grounding.js';
import { MAX_TOKENS, type LlmFeatureRunner } from './llm-feature-runner.js';
import type { JobApplicationRepository } from '../ports/job-application-repository.js';
import type { JobPostingRepository } from '../ports/job-posting-repository.js';

export interface ApplicationLetterServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  jobApplicationRepository: JobApplicationRepository;
  jobPostingRepository: JobPostingRepository;
}

export interface ApplicationLetterEnvelope {
  paragraphs: string[];
  provider: string;
  usage?: unknown;
  grounding: unknown;
  checks: ReturnType<typeof checkApplicationLetter>;
}

/**
 * Generate an Anschreiben from the posting's **full ad text** (AK-2.5), not the
 * skill tags. The company/title come from the application's snapshots; the ad
 * text is lazy-loaded from the posting (empty when the posting was deleted, so
 * `checks.references` reports an honest 0 — no fabricated text, §3.4). No
 * template fallback: missing key is 503, unusable reply is 502 (ADR-0057).
 */
export class ApplicationLetterService {
  private readonly runner: LlmFeatureRunner;
  private readonly applications: JobApplicationRepository;
  private readonly postings: JobPostingRepository;

  constructor(deps: ApplicationLetterServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.applications = deps.jobApplicationRepository;
    this.postings = deps.jobPostingRepository;
  }

  async generate(
    scope: string,
    userId: string,
    applicationId: string,
  ): Promise<{ letter: ApplicationLetterEnvelope }> {
    const application = await this.applications.findById(scope, applicationId);
    if (!application) throw new NotFoundError(`Job application ${applicationId} not found`);

    const posting = await this.postings.findById(scope, application.jobPostingId);
    const adText = posting?.description ?? '';
    const lang = detectLanguage(adText, 'de');

    const { content, provider, usage } = await this.runner.runFeature(
      userId,
      'applicationLetter',
      MAX_TOKENS.applicationLetter,
      applicationLetterPrompt(adText, application.documents, lang),
      {
        schema: applicationLetterResultSchema,
        normalize: (parsed: ApplicationLetterResult): ApplicationLetterResult => ({
          paragraphs: parsed.paragraphs.map((p) => p.trim()).filter((p) => p !== ''),
        }),
        // An empty reply (all paragraphs blank) is an unusable upstream result.
        accept: (normalized) => normalized.paragraphs.length > 0,
      },
    );

    const checks = checkApplicationLetter(content, {
      company: application.postingCompany,
      title: application.postingTitle,
      lang,
      adText,
    });

    const grounded = this.runner.withGrounding(
      content,
      content.paragraphs.join('\n'),
      groundingSource(application.documents),
      provider,
      usage,
    );

    return { letter: { ...grounded, checks } };
  }
}
