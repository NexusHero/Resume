import type { JobPostingDraft } from '../domain/job-posting.js';
import {
  MAX_POSTING_TEXT,
  jobPostingExtractPrompt,
  jobPostingExtractResultSchema,
} from '../domain/job-posting-extract.js';
import type { PageFetcher } from '../ports/page-fetcher.js';
import { MAX_TOKENS, type LlmFeatureRunner } from './llm-feature-runner.js';

export interface JobPostingExtractServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  pageFetcher: PageFetcher;
}

export interface ExtractedFields {
  company: string;
  title: string;
  location: string;
  country: string;
  requirements: string[];
}

/**
 * Field extraction for "Stelle einfügen" per text or URL (AK-1.3/1.5). Runs
 * through the shared `LlmFeatureRunner` (no second mechanism, no template
 * fallback): without a key the runner throws `AiNotConfiguredError` (503), an
 * unusable reply throws `UpstreamProviderError` (502). Returns an editable
 * draft — nothing is persisted here.
 */
export class JobPostingExtractService {
  private readonly runner: LlmFeatureRunner;
  private readonly fetcher: PageFetcher;

  constructor(deps: JobPostingExtractServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.fetcher = deps.pageFetcher;
  }

  /** Extract fields from pasted text. `url` is omitted (undefined, never ''). */
  async fromText(userId: string, text: string): Promise<JobPostingDraft> {
    const fields = await this.extract(userId, text.slice(0, MAX_POSTING_TEXT));
    return { ...fields, description: text, source: 'text' };
  }

  /** Fetch a URL (SSRF-guarded) then extract fields; `url` is the final URL. */
  async fromUrl(userId: string, url: string): Promise<JobPostingDraft> {
    const page = await this.fetcher.fetchPage(url);
    const fields = await this.extract(userId, page.text.slice(0, MAX_POSTING_TEXT));
    return { ...fields, description: page.text, source: 'url', url: page.finalUrl };
  }

  private async extract(userId: string, text: string): Promise<ExtractedFields> {
    const { content } = await this.runner.runFeature(
      userId,
      'postingExtract',
      MAX_TOKENS.postingExtract,
      jobPostingExtractPrompt(text),
      {
        schema: jobPostingExtractResultSchema,
        normalize: (parsed) => ({
          company: parsed.company.trim(),
          title: parsed.title.trim(),
          location: parsed.location.trim(),
          country: parsed.country.trim(),
          requirements: parsed.requirements.map((r) => r.trim()).filter((r) => r !== ''),
        }),
        // No silent empty draft: a reply with neither title nor company is an
        // unusable upstream result (502), not a blank form.
        accept: (content) => content.title !== '' || content.company !== '',
      },
    );
    return content;
  }
}
