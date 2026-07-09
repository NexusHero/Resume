import { RestJobSource } from '../../src/adapters/rest-job-source.js';
import { BUILTIN_JOB_SOURCE_DESCRIPTORS } from '../../src/adapters/builtin-job-sources.js';
import { jobSourceDescriptorSchema } from '../../src/domain/job-source-descriptor.js';
import type { JobSourceDescriptor } from '../../src/domain/job-source-descriptor.js';
import { jobQuerySchema } from '../../src/domain/job.js';
import type { HttpFetch } from '../../src/ports/http-fetch.js';
import { noopLogger } from '../support/fakes.js';

function fakeHttp(
  body: unknown,
  opts: { ok?: boolean; status?: number } = {},
): { http: HttpFetch; calls: { url: string; headers?: Record<string, string> }[] } {
  const calls: { url: string; headers?: Record<string, string> }[] = [];
  const http: HttpFetch = async (url, init) => {
    calls.push({ url, headers: init?.headers as Record<string, string> | undefined });
    return { ok: opts.ok ?? true, status: opts.status ?? 200, json: async () => body };
  };
  return { http, calls };
}

const src = (descriptor: JobSourceDescriptor, http: HttpFetch) =>
  new RestJobSource({ descriptor, httpFetch: http, logger: noopLogger });

describe('RestJobSource — generic descriptor engine', () => {
  const descriptor: JobSourceDescriptor = {
    name: 'Demo',
    url: 'https://demo.test/api/jobs',
    auth: { in: 'query', name: 'key', value: 'secret' },
    headers: { 'User-Agent': 'myJob/test' },
    params: { q: 'search', city: 'where', static: { limit: '25' } },
    itemsPath: 'data.results',
    snippetIsHtml: true,
    currency: '$',
    countryDefault: 'US',
    map: {
      id: 'ref.id',
      role: 'title',
      company: 'employer.name',
      city: 'place',
      country: 'nation',
      mode: 'kinds',
      salaryMin: 'pay.min',
      salaryMax: 'pay.max',
      posted: 'created',
      url: 'link',
      snippet: 'body',
      skills: 'tags',
    },
  };

  const body = {
    data: {
      results: [
        {
          ref: { id: 42 },
          title: 'Platform Engineer',
          employer: { name: 'Globex' },
          place: 'Remote',
          nation: 'Germany',
          kinds: ['full_time', 'contract'],
          pay: { min: 80000, max: 100000 },
          created: '2026-06-20T09:00:00Z',
          link: 'https://demo.test/jobs/42',
          body: '<p>Build <b>fast</b> platforms</p>',
          tags: ['Go', 'Kubernetes', 7],
        },
      ],
    },
  };

  it('Search_MapsDotPaths_AuthQuery_Params_SalaryRange', async () => {
    const { http, calls } = fakeHttp(body);
    const jobs = await src(descriptor, http).search(
      jobQuerySchema.parse({ q: 'engineer', city: 'Berlin' }),
    );

    expect(calls[0]?.url).toContain('limit=25');
    expect(calls[0]?.url).toContain('search=engineer');
    expect(calls[0]?.url).toContain('where=Berlin');
    expect(calls[0]?.url).toContain('key=secret');
    expect(calls[0]?.headers).toEqual({ 'User-Agent': 'myJob/test' });

    expect(jobs[0]).toMatchObject({
      id: '42',
      role: 'Platform Engineer',
      company: 'Globex',
      city: 'Remote',
      country: 'Germany',
      mode: 'full_time, contract',
      salary: '80.000 – 100.000 $',
      posted: '2026-06-20',
      url: 'https://demo.test/jobs/42',
      snippet: 'Build fast platforms',
      skills: ['Go', 'Kubernetes'],
      source: 'Demo',
    });
  });

  it('Search_CountryDefault_AppliesWhenMissing', async () => {
    const { http } = fakeHttp({ data: { results: [{ ref: { id: 1 }, title: 'X' }] } });
    const jobs = await src(descriptor, http).search(jobQuerySchema.parse({}));
    expect(jobs[0]?.country).toBe('US');
    expect(jobs[0]?.salary).toBeUndefined();
  });

  it('Search_AuthHeader_InjectsHeader', async () => {
    const d: JobSourceDescriptor = {
      name: 'H',
      url: 'https://h.test/api',
      auth: { in: 'header', name: 'X-API-Key', value: 'abc' },
      itemsPath: 'items',
      map: { id: 'id', role: 'role', company: 'company' },
    };
    const { http, calls } = fakeHttp({ items: [{ id: '1', role: 'R', company: 'C' }] });
    await src(d, http).search(jobQuerySchema.parse({}));
    expect(calls[0]?.headers).toEqual({ 'X-API-Key': 'abc' });
  });

  it('Search_EmptyItemsPath_TreatsBodyAsArray_AndDropsJunk', async () => {
    const d: JobSourceDescriptor = {
      name: 'Feed',
      url: 'https://feed.test/api',
      itemsPath: '',
      map: { id: 'id', role: 'position', company: 'company' },
    };
    const { http } = fakeHttp([
      { legal: 'do not scrape' }, // no role/company → dropped
      { id: '9', position: 'SRE', company: 'Initech' },
    ]);
    const jobs = await src(d, http).search(jobQuerySchema.parse({}));
    expect(jobs.map((j) => j.id)).toEqual(['9']);
  });

  it('Search_ClientFilter_FiltersByKeywordAndCity', async () => {
    const d: JobSourceDescriptor = {
      name: 'Feed',
      url: 'https://feed.test/api',
      itemsPath: '',
      clientFilter: true,
      map: { id: 'id', role: 'role', company: 'company', city: 'city', skills: 'tags' },
    };
    const rows = [
      { id: '1', role: 'Rust Engineer', company: 'Acme', city: 'Berlin', tags: ['Rust'] },
      { id: '2', role: 'Java Dev', company: 'Globex', city: 'München', tags: ['Java'] },
    ];
    const kw = await src(d, fakeHttp(rows).http).search(jobQuerySchema.parse({ q: 'rust' }));
    expect(kw.map((j) => j.id)).toEqual(['1']);
    const city = await src(d, fakeHttp(rows).http).search(jobQuerySchema.parse({ city: 'münchen' }));
    expect(city.map((j) => j.id)).toEqual(['2']);
  });

  it('Search_UnixSecondsDate_IsConverted', async () => {
    const d: JobSourceDescriptor = {
      name: 'U',
      url: 'https://u.test/api',
      itemsPath: '',
      map: { id: 'id', role: 'role', company: 'company', posted: 'ts' },
    };
    const { http } = fakeHttp([{ id: '1', role: 'R', company: 'C', ts: 1782534629 }]);
    const jobs = await src(d, http).search(jobQuerySchema.parse({}));
    expect(jobs[0]?.posted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('Search_Non2xx_Throws', async () => {
    const { http } = fakeHttp({}, { ok: false, status: 500 });
    await expect(src(descriptor, http).search(jobQuerySchema.parse({}))).rejects.toThrow(/500/);
  });
});

describe('Built-in descriptors', () => {
  it('AllValidateAgainstSchema', () => {
    for (const d of BUILTIN_JOB_SOURCE_DESCRIPTORS) {
      expect(() => jobSourceDescriptorSchema.parse(d)).not.toThrow();
    }
    expect(BUILTIN_JOB_SOURCE_DESCRIPTORS.map((d) => d.name)).toEqual([
      'Remotive',
      'Jobicy',
      'Remote OK',
    ]);
  });

  const find = (name: string) =>
    BUILTIN_JOB_SOURCE_DESCRIPTORS.find((d) => d.name === name) as JobSourceDescriptor;

  it('Remotive_MapsSamplePayload', async () => {
    const body = {
      jobs: [
        {
          id: 1806400,
          title: 'Senior Backend Engineer',
          company_name: 'Automattic',
          candidate_required_location: 'Worldwide',
          job_type: 'full_time',
          salary: '$100k - $140k',
          publication_date: '2026-06-25T12:00:00',
          url: 'https://remotive.com/remote-jobs/1806400',
          description: '<p>Join our <strong>backend</strong> team</p>',
          tags: ['python', 'django'],
        },
      ],
    };
    const { http, calls } = fakeHttp(body);
    const jobs = await src(find('Remotive'), http).search(jobQuerySchema.parse({ q: 'backend' }));
    expect(calls[0]?.url).toContain('search=backend');
    expect(calls[0]?.url).toContain('limit=50');
    expect(jobs[0]).toMatchObject({
      id: '1806400',
      role: 'Senior Backend Engineer',
      company: 'Automattic',
      city: 'Worldwide',
      mode: 'full_time',
      salary: '$100k - $140k',
      posted: '2026-06-25',
      snippet: 'Join our backend team',
      skills: ['python', 'django'],
      source: 'Remotive',
    });
  });

  it('Jobicy_MapsSamplePayload_WithSalaryRange', async () => {
    const body = {
      jobs: [
        {
          id: 98765,
          jobTitle: 'DevOps Engineer',
          companyName: 'Buffer',
          jobGeo: 'USA',
          jobType: ['full-time'],
          annualSalaryMin: 90000,
          annualSalaryMax: 120000,
          pubDate: '2026-06-24 08:00:00',
          url: 'https://jobicy.com/jobs/98765',
          jobExcerpt: 'Own our <em>CI/CD</em> pipeline',
          jobIndustry: ['DevOps', 'Cloud'],
        },
      ],
    };
    const { http, calls } = fakeHttp(body);
    const jobs = await src(find('Jobicy'), http).search(jobQuerySchema.parse({ q: 'devops' }));
    expect(calls[0]?.url).toContain('tag=devops');
    expect(jobs[0]).toMatchObject({
      id: '98765',
      role: 'DevOps Engineer',
      company: 'Buffer',
      city: 'USA',
      mode: 'full-time',
      salary: '90.000 – 120.000 $',
      posted: '2026-06-24',
      snippet: 'Own our CI/CD pipeline',
      skills: ['DevOps', 'Cloud'],
      source: 'Jobicy',
    });
  });

  it('RemoteOK_DropsLegalHeader_FiltersFeed_SendsUserAgent', async () => {
    const body = [
      { legal: 'Scraping the API without permission is prohibited.' },
      {
        id: '112233',
        position: 'Site Reliability Engineer',
        company: 'GitLab',
        location: 'Remote',
        salary_min: 100000,
        salary_max: 150000,
        date: '2026-06-23T00:00:00+00:00',
        url: 'https://remoteok.com/remote-jobs/112233',
        description: 'Keep the fleet healthy',
        tags: ['sre', 'kubernetes'],
      },
      {
        id: '445566',
        position: 'Frontend Developer',
        company: 'Zapier',
        location: 'Remote',
        date: '2026-06-22T00:00:00+00:00',
        url: 'https://remoteok.com/remote-jobs/445566',
        tags: ['react'],
      },
    ];
    const { http, calls } = fakeHttp(body);
    const jobs = await src(find('Remote OK'), http).search(jobQuerySchema.parse({ q: 'sre' }));
    expect(calls[0]?.headers).toMatchObject({ 'User-Agent': expect.stringContaining('myJob') });
    // legal header dropped as junk; keyword filter keeps only the SRE role
    expect(jobs.map((j) => j.id)).toEqual(['112233']);
    expect(jobs[0]).toMatchObject({
      role: 'Site Reliability Engineer',
      company: 'GitLab',
      salary: '100.000 – 150.000 $',
      skills: ['sre', 'kubernetes'],
      source: 'Remote OK',
    });
  });
});
