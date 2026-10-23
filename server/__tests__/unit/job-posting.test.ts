import {
  adoptJobPostingSchema,
  createJobPostingSchema,
  dedupKeyFor,
  extractJobPostingSchema,
  matchesJobPostingQuery,
  normalizeUrl,
  type JobPosting,
} from '../../src/domain/job-posting.js';

describe('JobPosting domain — zod schemas', () => {
  it('CreateJobPostingSchema_MissingCompany_Rejected', () => {
    const result = createJobPostingSchema.safeParse({ source: 'text', title: 'Engineer' });
    expect(result.success).toBe(false);
  });

  it('AdoptJobPostingSchema_NeitherSourceIdNorUrl_Rejected', () => {
    const result = adoptJobPostingSchema.safeParse({
      source: 'Arbeitnow',
      company: 'Acme',
      title: 'Engineer',
    });
    expect(result.success).toBe(false);
  });

  it('ExtractJobPostingSchema_BothTextAndUrl_Rejected', () => {
    const result = extractJobPostingSchema.safeParse({ text: 'x', url: 'https://a.test' });
    expect(result.success).toBe(false);
  });

  it('ExtractJobPostingSchema_ExactlyOne_Accepted', () => {
    expect(extractJobPostingSchema.safeParse({ text: 'some ad' }).success).toBe(true);
    expect(extractJobPostingSchema.safeParse({ url: 'https://example.com/job' }).success).toBe(
      true,
    );
  });

  it('CreateJobPostingSchema_UrlOver2000Chars_Rejected', () => {
    const url = `https://example.com/${'a'.repeat(2000)}`;
    const result = createJobPostingSchema.safeParse({
      source: 'url',
      url,
      company: 'Acme',
      title: 'Engineer',
    });
    expect(result.success).toBe(false);
  });
});

describe('JobPosting domain — normalizeUrl', () => {
  it('NormalizeUrl_StripsFragmentTrailingSlashAndLowercasesHost', () => {
    expect(normalizeUrl('https://Example.com/job/')).toBe('https://example.com/job');
    expect(normalizeUrl('https://example.com/job#section')).toBe('https://example.com/job');
    // the query is deliberately kept
    expect(normalizeUrl('https://Example.com/job/?q=1&r=2')).toBe(
      'https://example.com/job?q=1&r=2',
    );
    // the root path keeps its single slash
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('NormalizeUrl_InvalidUrl_ReturnsInputUntouched', () => {
    // `new URL` threw inside the try → the helper stays total and echoes the input.
    expect(normalizeUrl('http://[::1')).toBe('http://[::1');
  });
});

describe('JobPosting domain — dedupKeyFor', () => {
  it('DedupKeyFor_SourceIdPresent_UsesSourceAndSourceId', () => {
    expect(dedupKeyFor({ source: 'A', sourceId: '1', url: 'https://x.test' })).toEqual({
      source: 'A',
      sourceId: '1',
    });
  });

  it('DedupKeyFor_OnlyUrl_UsesUrl', () => {
    expect(dedupKeyFor({ source: 'url', url: 'https://x.test/job' })).toEqual({
      source: 'url',
      url: 'https://x.test/job',
    });
  });

  it('DedupKeyFor_EmptySourceId_TreatedAsUndefined', () => {
    expect(dedupKeyFor({ source: 'A', sourceId: '', url: 'https://x.test/job' })).toEqual({
      source: 'A',
      url: 'https://x.test/job',
    });
  });

  it('DedupKeyFor_NeitherSourceIdNorUrl_ReturnsNull', () => {
    expect(dedupKeyFor({ source: 'text' })).toBeNull();
  });
});

describe('JobPosting domain — matchesJobPostingQuery', () => {
  const posting: JobPosting = {
    id: '1',
    ownerId: 'team',
    source: 'text',
    company: 'Acme Corp',
    title: 'Backend Engineer',
    location: 'Berlin',
    country: 'DE',
    description: 'Distributed systems at scale.',
    requirements: [],
    descriptionIncomplete: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('EmptyOrWhitespaceQuery_ReturnsTrue', () => {
    expect(matchesJobPostingQuery(posting, '')).toBe(true);
    expect(matchesJobPostingQuery(posting, '   ')).toBe(true);
  });

  it('CaseInsensitiveFieldMatch_ReturnsTrue', () => {
    expect(matchesJobPostingQuery(posting, 'ACME')).toBe(true);
    expect(matchesJobPostingQuery(posting, 'berlin')).toBe(true);
  });

  it('NoFieldMatch_ReturnsFalse', () => {
    expect(matchesJobPostingQuery(posting, 'zzz')).toBe(false);
  });
});
