import { ApplicationLetterService } from '../../src/services/application-letter-service.js';
import { AiNotConfiguredError, UpstreamProviderError } from '../../src/domain/errors.js';
import { LlmFeatureRunner } from '../../src/services/llm-feature-runner.js';
import type { JobApplication } from '../../src/domain/job-application.js';
import type { JobPosting } from '../../src/domain/job-posting.js';
import { emptyContact, emptyDocuments } from '../../src/domain/talent-documents.js';
import {
  FakeLlmProvider,
  FixedClock,
  InMemoryJobApplicationRepository,
  InMemoryJobPostingRepository,
  InMemoryUsageMeter,
  InMemoryUserRepository,
  fakeLlmService,
  noopLogger,
} from '../support/fakes.js';

const posting = (id: string, description: string): JobPosting => ({
  id,
  ownerId: 'team',
  source: 'text',
  company: 'Acme',
  title: 'Engineer',
  location: '',
  country: '',
  description,
  requirements: ['Rust'],
  descriptionIncomplete: false,
  createdAt: '2026-06-25T10:00:00.000Z',
});

const application = (id: string): JobApplication => ({
  id,
  ownerId: 'team',
  jobPostingId: 'p1',
  postingCompany: 'Acme Corp',
  postingTitle: 'Senior Engineer',
  talentId: 't1',
  talentName: 'Ada Lovelace',
  status: 'draft',
  statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
  documents: emptyDocuments(
    'team',
    't1',
    { ...emptyContact, name: 'Ada Lovelace' },
    '2026-06-25T10:00:00.000Z',
  ),
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

function makeService(provider: FakeLlmProvider) {
  const llm = fakeLlmService({ available: provider.available, provider });
  const runner = new LlmFeatureRunner({
    llmService: llm.service,
    userRepository: new InMemoryUserRepository(),
    usageMeter: new InMemoryUsageMeter(),
    clock: new FixedClock(),
    logger: noopLogger,
  });
  const applications = new InMemoryJobApplicationRepository();
  const postings = new InMemoryJobPostingRepository();
  const service = new ApplicationLetterService({
    llmFeatureRunner: runner,
    jobApplicationRepository: applications,
    jobPostingRepository: postings,
  });
  return { applications, postings, service, provider };
}

describe('ApplicationLetterService.generate', () => {
  it('ApplicationLetterService_NoProvider_ThrowsAiNotConfiguredAndMakesNoCall', async () => {
    const provider = new FakeLlmProvider('claude', false, 'unused');
    const { applications, postings, service } = makeService(provider);
    await applications.add(application('a1'));
    await postings.add(posting('p1', 'We need a Rust engineer.'));

    await expect(service.generate('team', 'u1', 'a1')).rejects.toBeInstanceOf(AiNotConfiguredError);
    expect(provider.calls).toBe(0);
  });

  it('ApplicationLetterService_ProviderFails_ThrowsUpstreamProviderError', async () => {
    const provider = new FakeLlmProvider('claude', true, 'unused');
    provider.failWith = new Error('upstream down');
    const { applications, postings, service } = makeService(provider);
    await applications.add(application('a1'));
    await postings.add(posting('p1', 'We need a Rust engineer.'));

    await expect(service.generate('team', 'u1', 'a1')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('ApplicationLetterService_ReplyUnusableOrEmpty_ThrowsUpstreamProviderError', async () => {
    const provider = new FakeLlmProvider('claude', true, '{"paragraphs":[""]}');
    const { applications, postings, service } = makeService(provider);
    await applications.add(application('a1'));
    await postings.add(posting('p1', 'We need a Rust engineer.'));

    await expect(service.generate('team', 'u1', 'a1')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('ApplicationLetterService_ValidReply_ReturnsParagraphsProviderUsageGroundingAndChecks', async () => {
    const reply =
      '{"paragraphs":["I am applying to Acme Corp for the Senior Engineer role. ' +
      'My background in distributed systems and Kubernetes matches your posting."]}';
    const provider = new FakeLlmProvider('claude', true, reply);
    const { applications, postings, service } = makeService(provider);
    await applications.add(application('a1'));
    await postings.add(posting('p1', 'We need distributed systems and Kubernetes experience.'));

    const result = await service.generate('team', 'u1', 'a1');
    expect(result.letter.paragraphs).toHaveLength(1);
    expect(result.letter.provider).toBe('claude');
    expect(result.letter.usage).toBeDefined();
    expect(result.letter.grounding).toBeDefined();
    expect(result.letter.checks).toMatchObject({
      mentionsCompany: true,
      mentionsTitle: true,
    });
    expect(result.letter.checks.references).toBeGreaterThanOrEqual(2);
  });
});
