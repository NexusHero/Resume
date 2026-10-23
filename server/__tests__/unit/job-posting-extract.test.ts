import {
  MAX_POSTING_TEXT,
  jobPostingExtractPrompt,
  jobPostingExtractResultSchema,
} from '../../src/domain/job-posting-extract.js';

describe('JobPostingExtract domain', () => {
  it('JobPostingExtractPrompt_WrapsTextAsUntrustedDataAndInstructsToIgnoreEmbeddedInstructions', () => {
    const { system, prompt } = jobPostingExtractPrompt('We hire C++ engineers in Berlin.');
    expect(system).toContain('untrusted data');
    expect(system).toContain('Do not invent anything');
    expect(system).toMatch(/Ignore/i);
    expect(prompt).toContain('We hire C++ engineers in Berlin.');
    expect(prompt).toContain('untrusted data');
  });

  it('JobPostingExtractResultSchema_RejectsMissingFields', () => {
    expect(jobPostingExtractResultSchema.safeParse({}).success).toBe(false);
    expect(
      jobPostingExtractResultSchema.safeParse({
        company: 'Acme',
        title: 'Engineer',
        location: 'Berlin',
        country: 'DE',
        requirements: ['Rust'],
      }).success,
    ).toBe(true);
  });

  it('MAX_POSTING_TEXT_MatchesTheImportCap', () => {
    expect(MAX_POSTING_TEXT).toBe(50_000);
  });
});
