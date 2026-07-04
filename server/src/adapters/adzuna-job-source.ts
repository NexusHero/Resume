import type { Job, JobQuery } from '../domain/job.js';
import type { JobSource } from '../ports/job-source.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';
import { snippetFrom } from './html-text.js';

interface AdzunaJob {
  id?: string | number;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  salary_min?: number;
  salary_max?: number;
  created?: string;
  redirect_url?: string;
  description?: string;
  category?: { label?: string };
}

export interface AdzunaConfig {
  appId: string;
  appKey: string;
  country: string; // ISO country code, e.g. 'de'
}

/**
 * Adzuna — global job aggregator (free tier, app id + key). Server-side filtering
 * via `what`/`where`. Postings have no skill tags; the job category is surfaced as
 * a coarse skill until LLM extraction (roadmap 3.2) lands.
 */
export class AdzunaJobSource implements JobSource {
  readonly name = 'Adzuna';
  private readonly http: HttpFetch;
  private readonly logger: Logger;
  private readonly cfg: AdzunaConfig;

  constructor(deps: { httpFetch: HttpFetch; logger: Logger } & AdzunaConfig) {
    this.http = deps.httpFetch;
    this.logger = deps.logger;
    this.cfg = { appId: deps.appId, appKey: deps.appKey, country: deps.country };
  }

  async search(query: JobQuery): Promise<Job[]> {
    const params = new URLSearchParams({
      app_id: this.cfg.appId,
      app_key: this.cfg.appKey,
      results_per_page: '25',
      'content-type': 'application/json',
    });
    if (query.q) params.set('what', query.q);
    if (query.city) params.set('where', query.city);

    const url = `https://api.adzuna.com/v1/api/jobs/${this.cfg.country}/search/1?${params.toString()}`;
    const res = await this.http(url);
    if (!res.ok) throw new Error(`Adzuna responded ${res.status}`);
    const body = (await res.json()) as { results?: AdzunaJob[] };
    const jobs = (body.results ?? []).map((j) => this.map(j));
    this.logger.debug({ source: this.name, count: jobs.length }, 'job source search');
    return jobs;
  }

  private map(j: AdzunaJob): Job {
    return {
      id: String(j.id ?? ''),
      company: j.company?.display_name ?? '',
      role: j.title ?? '',
      city: j.location?.display_name ?? j.location?.area?.slice(-1)[0] ?? '',
      country: this.cfg.country.toUpperCase(),
      mode: '',
      salary: this.salary(j),
      posted: j.created ? j.created.slice(0, 10) : undefined,
      // Adzuna's coarse category (e.g. "IT Jobs") is not a skill; real skills are
      // recovered from the description by the SkillExtractor (roadmap 3.2).
      skills: [],
      snippet: snippetFrom(j.description),
      source: this.name,
      url: j.redirect_url,
    };
  }

  private salary(j: AdzunaJob): string | undefined {
    const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
    if (j.salary_min && j.salary_max) return `${fmt(j.salary_min)} – ${fmt(j.salary_max)} €`;
    if (j.salary_min) return `ab ${fmt(j.salary_min)} €`;
    return undefined;
  }
}
