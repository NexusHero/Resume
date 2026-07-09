import type { Job, JobQuery } from '../domain/job.js';
import type { JobSourceDescriptor } from '../domain/job-source-descriptor.js';
import type { JobSource } from '../ports/job-source.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';
import { snippetFrom } from './html-text.js';

/** Read a dot-path ("a.b.0.c") out of a nested value; "" returns the value itself. */
function pick(obj: unknown, path: string | undefined): unknown {
  if (!path) return path === '' ? obj : undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) return acc[Number(key)];
    if (typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Coerce a mapped value to a display string (arrays are joined, scalars stringified). */
function asString(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(', ');
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/** Normalize a publication date: ISO strings → yyyy-mm-dd, unix seconds → date. */
function asDate(v: unknown): string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Unix seconds (10 digits) vs milliseconds (13) — scale accordingly.
    const ms = v < 1e12 ? v * 1000 : v;
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (typeof v === 'string' && v) return v.slice(0, 10);
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/**
 * A job source driven entirely by a {@link JobSourceDescriptor} — no bespoke
 * code per board. It builds the request (params, auth, headers), reads the
 * postings array at `itemsPath`, and maps each item's dot-path fields onto the
 * normalized {@link Job}. Boards without server-side search set `clientFilter`
 * so the feed is filtered here instead. Postings that map to neither a role nor
 * a company (e.g. a board's leading metadata element) are dropped as junk.
 */
export class RestJobSource implements JobSource {
  readonly name: string;
  private readonly d: JobSourceDescriptor;
  private readonly http: HttpFetch;
  private readonly logger: Logger;

  constructor(deps: { descriptor: JobSourceDescriptor; httpFetch: HttpFetch; logger: Logger }) {
    this.d = deps.descriptor;
    this.name = deps.descriptor.name;
    this.http = deps.httpFetch;
    this.logger = deps.logger;
  }

  async search(query: JobQuery): Promise<Job[]> {
    const url = this.buildUrl(query);
    const headers: Record<string, string> = { ...(this.d.headers ?? {}) };
    if (this.d.auth?.in === 'header') headers[this.d.auth.name] = this.d.auth.value;

    const res = await this.http(url, Object.keys(headers).length ? { headers } : undefined);
    if (!res.ok) throw new Error(`${this.name} responded ${res.status}`);
    const body = await res.json();

    const items = pick(body, this.d.itemsPath);
    const rows = Array.isArray(items) ? items : [];
    let jobs = rows
      .map((item) => this.map(item))
      .filter((j) => j.role.trim() !== '' || j.company.trim() !== '');
    if (this.d.clientFilter) jobs = this.filter(jobs, query);

    this.logger.debug({ source: this.name, count: jobs.length }, 'job source search');
    return jobs;
  }

  private buildUrl(query: JobQuery): string {
    const u = new URL(this.d.url);
    const p = this.d.params;
    if (p?.static) for (const [k, v] of Object.entries(p.static)) u.searchParams.set(k, v);
    if (p?.q && query.q) u.searchParams.set(p.q, query.q);
    if (p?.city && query.city) u.searchParams.set(p.city, query.city);
    if (this.d.auth?.in === 'query') u.searchParams.set(this.d.auth.name, this.d.auth.value);
    return u.toString();
  }

  private map(item: unknown): Job {
    const m = this.d.map;
    const rawSnippet = asString(pick(item, m.snippet));
    const skillsVal = pick(item, m.skills);
    const skills = Array.isArray(skillsVal)
      ? skillsVal.filter((s): s is string => typeof s === 'string')
      : [];
    return {
      id: asString(pick(item, m.id)),
      company: asString(pick(item, m.company)),
      role: asString(pick(item, m.role)),
      city: asString(pick(item, m.city)),
      country: asString(pick(item, m.country)) || this.d.countryDefault || '',
      mode: asString(pick(item, m.mode)),
      salary: this.salary(item),
      posted: asDate(pick(item, m.posted)),
      skills,
      snippet: this.d.snippetIsHtml ? snippetFrom(rawSnippet) : rawSnippet,
      source: this.name,
      url: asString(pick(item, m.url)) || undefined,
    };
  }

  private salary(item: unknown): string | undefined {
    const m = this.d.map;
    if (m.salaryMin || m.salaryMax) {
      const min = asNumber(pick(item, m.salaryMin));
      const max = asNumber(pick(item, m.salaryMax));
      const cur = this.d.currency ?? '€';
      const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
      if (min && max) return `${fmt(min)} – ${fmt(max)} ${cur}`;
      if (min) return `ab ${fmt(min)} ${cur}`;
      if (max) return `bis ${fmt(max)} ${cur}`;
    }
    return asString(pick(item, m.salary)) || undefined;
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
