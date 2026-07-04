import type { Job, JobQuery } from '../domain/job.js';
import type { JobSource } from '../ports/job-source.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';

const BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs';

interface BaJob {
  refnr?: string;
  titel?: string;
  beruf?: string;
  arbeitgeber?: string;
  arbeitsort?: { ort?: string; region?: string; land?: string };
  aktuelleVeroeffentlichungsdatum?: string;
  externeUrl?: string;
}

/**
 * Bundesagentur für Arbeit — the official German public job board. Server-side
 * filtering via `was`/`wo`; authenticated with the well-known public API key.
 * Postings carry no skill tags, so matches rely on role/keyword signal.
 */
export class BundesagenturJobSource implements JobSource {
  readonly name = 'Bundesagentur';
  private readonly http: HttpFetch;
  private readonly logger: Logger;
  private readonly apiKey: string;

  constructor(deps: { httpFetch: HttpFetch; logger: Logger; apiKey: string }) {
    this.http = deps.httpFetch;
    this.logger = deps.logger;
    this.apiKey = deps.apiKey;
  }

  async search(query: JobQuery): Promise<Job[]> {
    const params = new URLSearchParams({ size: '25' });
    if (query.q) params.set('was', query.q);
    if (query.city) params.set('wo', query.city);

    const res = await this.http(`${BASE}?${params.toString()}`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`Bundesagentur responded ${res.status}`);
    const body = (await res.json()) as { stellenangebote?: BaJob[] };
    const jobs = (body.stellenangebote ?? []).map((j) => this.map(j));
    this.logger.debug({ source: this.name, count: jobs.length }, 'job source search');
    return jobs;
  }

  private map(j: BaJob): Job {
    const refnr = j.refnr ?? '';
    return {
      id: refnr,
      company: j.arbeitgeber ?? '',
      role: j.titel ?? j.beruf ?? '',
      city: j.arbeitsort?.ort ?? '',
      country: j.arbeitsort?.land ?? 'Deutschland',
      mode: '',
      posted: j.aktuelleVeroeffentlichungsdatum,
      skills: [],
      snippet: j.beruf ?? '',
      source: this.name,
      url: j.externeUrl ?? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refnr}`,
    };
  }
}
