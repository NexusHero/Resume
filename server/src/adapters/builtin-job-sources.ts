import type { JobSourceDescriptor } from '../domain/job-source-descriptor.js';

/**
 * Built-in descriptor-driven job boards — keyless, free public APIs that need no
 * bespoke adapter. They are enabled by default alongside the hand-written
 * sources (Arbeitnow, Bundesagentur, Adzuna); operators add more via
 * JOB_SOURCES_FILE. All three below are remote-first boards, broadening the
 * German/on-site coverage of the hand-written sources.
 */
export const BUILTIN_JOB_SOURCE_DESCRIPTORS: JobSourceDescriptor[] = [
  {
    // https://remotive.com/api/remote-jobs — remote tech/other, server-side search.
    name: 'Remotive',
    url: 'https://remotive.com/api/remote-jobs',
    params: { q: 'search', static: { limit: '50' } },
    itemsPath: 'jobs',
    snippetIsHtml: true,
    countryDefault: '',
    map: {
      id: 'id',
      role: 'title',
      company: 'company_name',
      city: 'candidate_required_location',
      mode: 'job_type',
      salary: 'salary',
      posted: 'publication_date',
      url: 'url',
      snippet: 'description',
      skills: 'tags',
    },
  },
  {
    // https://jobicy.com/api/v2/remote-jobs — remote jobs, filter by tag.
    name: 'Jobicy',
    url: 'https://jobicy.com/api/v2/remote-jobs',
    params: { q: 'tag', static: { count: '50' } },
    itemsPath: 'jobs',
    snippetIsHtml: true,
    currency: '$',
    countryDefault: '',
    map: {
      id: 'id',
      role: 'jobTitle',
      company: 'companyName',
      city: 'jobGeo',
      mode: 'jobType',
      salaryMin: 'annualSalaryMin',
      salaryMax: 'annualSalaryMax',
      posted: 'pubDate',
      url: 'url',
      snippet: 'jobExcerpt',
      skills: 'jobIndustry',
    },
  },
  {
    // https://remoteok.com/api — remote feed (no server-side search; filtered here).
    // The first element is a legal/metadata object with no position → dropped as junk.
    // A descriptive User-Agent is required or the endpoint may reject the request.
    name: 'Remote OK',
    url: 'https://remoteok.com/api',
    headers: { 'User-Agent': 'myJob/1.0 (+https://myjob.app)' },
    itemsPath: '',
    clientFilter: true,
    snippetIsHtml: true,
    currency: '$',
    countryDefault: '',
    map: {
      id: 'id',
      role: 'position',
      company: 'company',
      city: 'location',
      salaryMin: 'salary_min',
      salaryMax: 'salary_max',
      posted: 'date',
      url: 'url',
      snippet: 'description',
      skills: 'tags',
    },
  },
];
