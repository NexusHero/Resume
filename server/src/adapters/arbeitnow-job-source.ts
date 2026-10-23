import type { Job, JobPostingDetail, JobQuery } from '../domain/job.js';
import { PostingFetchError } from '../domain/errors.js';
import type { JobSource } from '../ports/job-source.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';
import { htmlToText, snippetFrom } from './html-text.js';

const ENDPOINT = 'https://www.arbeitnow.com/api/job-board-api';

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  location?: string;
  created_at?: number; // unix seconds
}

/** Arbeitnow — open tech/EN job feed, no key. Filtered client-side (feed API). */
export class ArbeitnowJobSource implements JobSource {
  readonly name = 'Arbeitnow';
  private readonly http: HttpFetch;
  private readonly logger: Logger;

  constructor(deps: { httpFetch: HttpFetch; logger: Logger }) {
    this.http = deps.httpFetch;
    this.logger = deps.logger;
  }

  async search(query: JobQuery): Promise<Job[]> {
    const res = await this.http(ENDPOINT);
    if (!res.ok) throw new Error(`Arbeitnow responded ${res.status}`);
    const body = (await res.json()) as { data?: ArbeitnowJob[] };
    const jobs = this.filter(
      (body.data ?? []).map((j) => this.map(j)),
      query,
    );
    this.logger.debug({ source: this.name, count: jobs.length }, 'job source search');
    return jobs;
  }

  private map(j: ArbeitnowJob): Job {
    return {
      id: j.slug,
      company: j.company_name ?? '',
      role: j.title ?? '',
      city: j.location ?? '',
      country: '',
      mode: j.remote ? 'remote' : 'on-site',
      posted: j.created_at ? new Date(j.created_at * 1000).toISOString().slice(0, 10) : undefined,
      skills: j.tags ?? [],
      snippet: snippetFrom(j.description),
      source: this.name,
      url: j.url,
    };
  }

  /**
   * The full ad text for one posting. `map()` only keeps the 180-character
   * `snippet`, so the feed is **always** re-fetched here and the `slug` matched
   * (the plan/ADR wording "already in the search" is wrong — the search holds
   * only a snippet).
   */
  async getPosting(sourceId: string): Promise<JobPostingDetail | null> {
    const res = await this.http(ENDPOINT);
    if (!res.ok) throw new PostingFetchError('detail-fetch');
    const body = (await res.json()) as { data?: ArbeitnowJob[] };
    const job = (body.data ?? []).find((j) => j.slug === sourceId);
    if (!job) return null;
    const text = htmlToText(job.description ?? '');
    // An empty (or markup-only) description yields no full text → treat it like
    // an absent detail so the posting is flagged `descriptionIncomplete` (AK-1.2),
    // matching the Bundesagentur source.
    return text.trim() ? { description: text } : null;
  }

  private filter(jobs: Job[], query: JobQuery): Job[] {
    const kw = query.q?.trim().toLowerCase();
    const city = query.city?.trim().toLowerCase();
    return jobs.filter((job) => {
      if (city && !job.city.toLowerCase().includes(city)) return false;
      if (kw) {
        const hay = `${job.role} ${job.company} ${job.skills.join(' ')}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }
}
