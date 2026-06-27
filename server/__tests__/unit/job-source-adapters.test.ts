import { ArbeitnowJobSource } from '../../src/adapters/arbeitnow-job-source';
import { BundesagenturJobSource } from '../../src/adapters/bundesagentur-job-source';
import { AdzunaJobSource } from '../../src/adapters/adzuna-job-source';
import { jobQuerySchema } from '../../src/domain/job';
import type { HttpFetch } from '../../src/ports/http-fetch';
import { noopLogger } from '../support/fakes';

/** A fake HttpFetch that records the URL/headers and returns a canned body. */
function fakeHttp(
  body: unknown,
  opts: { ok?: boolean; status?: number } = {},
): { http: HttpFetch; calls: { url: string; headers?: Record<string, string> }[] } {
  const calls: { url: string; headers?: Record<string, string> }[] = [];
  const http: HttpFetch = async (url, init) => {
    calls.push({ url, headers: init?.headers });
    return { ok: opts.ok ?? true, status: opts.status ?? 200, json: async () => body };
  };
  return { http, calls };
}

describe('ArbeitnowJobSource', () => {
  const body = {
    data: [
      {
        slug: 'rust-eng-berlin',
        company_name: 'Acme',
        title: 'Rust Engineer',
        description: '<p>Build <b>fast</b> systems</p>',
        remote: true,
        url: 'https://acme.test/job',
        tags: ['Rust', 'gRPC'],
        location: 'Berlin',
        created_at: 1782534629,
      },
      {
        slug: 'java-muc',
        company_name: 'Globex',
        title: 'Java Developer',
        remote: false,
        tags: ['Java'],
        location: 'München',
      },
    ],
  };

  it('Search_MapsFeedToJobs', async () => {
    const { http } = fakeHttp(body);
    const jobs = await new ArbeitnowJobSource({ httpFetch: http, logger: noopLogger }).search(
      jobQuerySchema.parse({}),
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      id: 'rust-eng-berlin',
      company: 'Acme',
      role: 'Rust Engineer',
      city: 'Berlin',
      mode: 'remote',
      skills: ['Rust', 'gRPC'],
      snippet: 'Build fast systems',
      source: 'Arbeitnow',
      url: 'https://acme.test/job',
    });
    expect(jobs[0]?.posted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(jobs[1]?.mode).toBe('vor Ort');
  });

  it('Search_FiltersClientSideByKeywordAndCity', async () => {
    const { http } = fakeHttp(body);
    const src = new ArbeitnowJobSource({ httpFetch: http, logger: noopLogger });
    expect((await src.search(jobQuerySchema.parse({ q: 'rust' }))).map((j) => j.id)).toEqual([
      'rust-eng-berlin',
    ]);
    expect((await src.search(jobQuerySchema.parse({ city: 'münchen' }))).map((j) => j.id)).toEqual([
      'java-muc',
    ]);
  });

  it('Search_Non2xx_Throws', async () => {
    const { http } = fakeHttp({}, { ok: false, status: 503 });
    await expect(
      new ArbeitnowJobSource({ httpFetch: http, logger: noopLogger }).search(
        jobQuerySchema.parse({}),
      ),
    ).rejects.toThrow(/503/);
  });

  it('Search_SparseJob_UsesFallbacks', async () => {
    const { http } = fakeHttp({ data: [{ slug: 'bare' }] });
    const jobs = await new ArbeitnowJobSource({ httpFetch: http, logger: noopLogger }).search(
      jobQuerySchema.parse({}),
    );
    expect(jobs[0]).toMatchObject({
      id: 'bare',
      company: '',
      role: '',
      city: '',
      mode: 'vor Ort',
      skills: [],
      snippet: '',
    });
    expect(jobs[0]?.posted).toBeUndefined();
  });

  it('Search_MissingDataArray_ReturnsEmpty', async () => {
    const { http } = fakeHttp({});
    expect(
      await new ArbeitnowJobSource({ httpFetch: http, logger: noopLogger }).search(
        jobQuerySchema.parse({}),
      ),
    ).toEqual([]);
  });
});

describe('BundesagenturJobSource', () => {
  const body = {
    stellenangebote: [
      {
        refnr: '14225-abc-S',
        titel: 'Software Engineer (m/w/d)',
        beruf: 'Ingenieur/in - Systems Engineering',
        arbeitgeber: 'Amazon',
        arbeitsort: { ort: 'Berlin', region: 'Berlin', land: 'Deutschland' },
        aktuelleVeroeffentlichungsdatum: '2026-06-23',
        externeUrl: 'https://jobvector.test/job',
      },
    ],
  };

  it('Search_SendsApiKeyAndQueryParams_MapsResult', async () => {
    const { http, calls } = fakeHttp(body);
    const jobs = await new BundesagenturJobSource({
      httpFetch: http,
      logger: noopLogger,
      apiKey: 'jobboerse-jobsuche',
    }).search(jobQuerySchema.parse({ q: 'Software', city: 'Berlin' }));

    expect(calls[0]?.headers).toEqual({ 'X-API-Key': 'jobboerse-jobsuche' });
    expect(calls[0]?.url).toContain('was=Software');
    expect(calls[0]?.url).toContain('wo=Berlin');
    expect(jobs[0]).toMatchObject({
      id: '14225-abc-S',
      company: 'Amazon',
      role: 'Software Engineer (m/w/d)',
      city: 'Berlin',
      country: 'Deutschland',
      skills: [],
      source: 'Bundesagentur',
      url: 'https://jobvector.test/job',
    });
  });

  it('Search_NoExterneUrl_BuildsDetailUrl', async () => {
    const { http } = fakeHttp({
      stellenangebote: [{ refnr: 'XYZ', titel: 'Dev', arbeitgeber: 'X' }],
    });
    const jobs = await new BundesagenturJobSource({
      httpFetch: http,
      logger: noopLogger,
      apiKey: 'k',
    }).search(jobQuerySchema.parse({}));
    expect(jobs[0]?.url).toBe('https://www.arbeitsagentur.de/jobsuche/jobdetail/XYZ');
  });

  it('Search_SparseJob_FallsBackToBerufAndDefaults', async () => {
    // no titel, no arbeitgeber, no arbeitsort, no refnr
    const { http } = fakeHttp({ stellenangebote: [{ beruf: 'Fachinformatiker' }] });
    const jobs = await new BundesagenturJobSource({
      httpFetch: http,
      logger: noopLogger,
      apiKey: 'k',
    }).search(jobQuerySchema.parse({}));
    expect(jobs[0]).toMatchObject({
      id: '',
      company: '',
      role: 'Fachinformatiker',
      city: '',
      country: 'Deutschland',
    });
  });

  it('Search_MissingArray_ReturnsEmpty', async () => {
    const { http } = fakeHttp({});
    expect(
      await new BundesagenturJobSource({ httpFetch: http, logger: noopLogger, apiKey: 'k' }).search(
        jobQuerySchema.parse({}),
      ),
    ).toEqual([]);
  });
});

describe('AdzunaJobSource', () => {
  const body = {
    results: [
      {
        id: 12345,
        title: 'Backend Engineer',
        company: { display_name: 'Initech' },
        location: { display_name: 'Hamburg', area: ['Deutschland', 'Hamburg'] },
        salary_min: 70000,
        salary_max: 90000,
        created: '2026-06-20T10:00:00Z',
        redirect_url: 'https://adzuna.test/12345',
        description: 'Work on <strong>scalable</strong> services.',
        category: { label: 'IT Jobs' },
      },
    ],
  };

  it('Search_SendsCredentials_MapsResult', async () => {
    const { http, calls } = fakeHttp(body);
    const jobs = await new AdzunaJobSource({
      httpFetch: http,
      logger: noopLogger,
      appId: 'app',
      appKey: 'secret',
      country: 'de',
    }).search(jobQuerySchema.parse({ q: 'engineer', city: 'Hamburg' }));

    expect(calls[0]?.url).toContain('/jobs/de/search/1?');
    expect(calls[0]?.url).toContain('app_id=app');
    expect(calls[0]?.url).toContain('app_key=secret');
    expect(calls[0]?.url).toContain('what=engineer');
    expect(jobs[0]).toMatchObject({
      id: '12345',
      company: 'Initech',
      role: 'Backend Engineer',
      city: 'Hamburg',
      country: 'DE',
      salary: '70.000 – 90.000 €',
      skills: ['IT Jobs'],
      snippet: 'Work on scalable services.',
      source: 'Adzuna',
    });
    expect(jobs[0]?.posted).toBe('2026-06-20');
  });

  it('Search_OnlyMinSalary_FormatsFromLowerBound', async () => {
    const { http } = fakeHttp({ results: [{ id: 1, title: 'X', salary_min: 60000 }] });
    const jobs = await new AdzunaJobSource({
      httpFetch: http,
      logger: noopLogger,
      appId: 'a',
      appKey: 'b',
      country: 'at',
    }).search(jobQuerySchema.parse({}));
    expect(jobs[0]?.salary).toBe('ab 60.000 €');
    expect(jobs[0]?.skills).toEqual([]);
  });

  it('Search_SparseResult_NoSalaryUsesAreaFallbackAndDefaults', async () => {
    // no display_name → city from area; no id/title/created/salary
    const { http } = fakeHttp({ results: [{ location: { area: ['DE', 'Bayern', 'Nürnberg'] } }] });
    const jobs = await new AdzunaJobSource({
      httpFetch: http,
      logger: noopLogger,
      appId: 'a',
      appKey: 'b',
      country: 'de',
    }).search(jobQuerySchema.parse({}));
    expect(jobs[0]).toMatchObject({ id: '', company: '', role: '', city: 'Nürnberg' });
    expect(jobs[0]?.salary).toBeUndefined();
    expect(jobs[0]?.posted).toBeUndefined();
  });

  it('Search_MissingResults_ReturnsEmpty', async () => {
    const { http } = fakeHttp({});
    expect(
      await new AdzunaJobSource({
        httpFetch: http,
        logger: noopLogger,
        appId: 'a',
        appKey: 'b',
        country: 'de',
      }).search(jobQuerySchema.parse({})),
    ).toEqual([]);
  });
});
