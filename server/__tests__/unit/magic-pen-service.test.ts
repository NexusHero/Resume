import { MagicPenService } from '../../src/services/magic-pen-service.js';
import { ApplicationLetterService } from '../../src/services/application-letter-service.js';
import { LlmFeatureRunner } from '../../src/services/llm-feature-runner.js';
import {
  AiNotConfiguredError,
  NotFoundError,
  UpstreamProviderError,
  ValidationError,
} from '../../src/domain/errors.js';
import type { JobApplication } from '../../src/domain/job-application.js';
import type { JobPosting } from '../../src/domain/job-posting.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';
import { emptyContact, emptyDocuments } from '../../src/domain/talent-documents.js';
import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
} from '../../src/ports/llm-provider.js';
import { LlmService } from '../../src/services/llm-service.js';
import {
  FakeLlmProvider,
  FixedClock,
  InMemoryDocumentRepository,
  InMemoryJobApplicationRepository,
  InMemoryJobPostingRepository,
  InMemoryUsageMeter,
  InMemoryUserRepository,
  noopLogger,
} from '../support/fakes.js';

const TIME = '2026-06-25T10:00:00.000Z';

const docs = (
  skills: string[],
  extra: Partial<TalentDocuments['resume']> = {},
): TalentDocuments => ({
  ownerId: 'team',
  talentId: 't1',
  contact: { ...emptyContact, name: 'Ada', role: 'Backend Engineer' },
  resume: {
    summary: 'Backend engineer.',
    experience: [
      {
        role: 'Backend Engineer',
        company: 'Acme',
        period: '2018–2022',
        location: '',
        bullets: ['Built APIs'],
        skills: [],
      },
    ],
    education: [],
    skillGroups: [{ label: 'x', items: skills }],
    rawText: '',
    ...extra,
  },
  letter: {
    firma: '',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: '',
    absaetze: ['Old paragraph'],
    gruss: '',
  },
  style: {
    template: 'classic',
    accent: '#000',
    strong: '#000',
    onDark: '#000',
    font: 'x',
    size: 1,
  },
  updatedAt: TIME,
});

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
  createdAt: TIME,
});

const application = (id: string, copy: TalentDocuments): JobApplication => ({
  id,
  ownerId: 'team',
  jobPostingId: 'p1',
  postingCompany: 'Acme Corp',
  postingTitle: 'Senior Engineer',
  talentId: 't1',
  talentName: 'Ada Lovelace',
  status: 'draft',
  statusHistory: [{ status: 'draft', at: TIME }],
  documents: copy,
  createdAt: TIME,
  updatedAt: TIME,
});

/** A provider that answers each section with the right schema, keyed off its system prompt. */
const schemaAwareProvider = (): FakeLlmProvider => {
  const provider = new FakeLlmProvider('claude', true, '{}');
  provider.generate = async (input: LlmGenerateInput): Promise<LlmGenerateResult> => {
    provider.calls += 1;
    provider.lastInput = input;
    if (provider.failWith) throw provider.failWith;
    const sys = input.system ?? '';
    if (sys.includes('"bullets"'))
      return { text: '{"bullets":["did the thing"]}', usage: { inputTokens: 1, outputTokens: 1 } };
    if (sys.includes('"groups"'))
      return {
        text: '{"groups":[{"label":"Languages","items":["Go"]}]}',
        usage: { inputTokens: 1, outputTokens: 1 },
      };
    if (sys.includes('"paragraphs"'))
      return {
        text: '{"paragraphs":["Dear team, I use Kubernetes daily."]}',
        usage: { inputTokens: 1, outputTokens: 1 },
      };
    return { text: '{"text":"Tuned text"}', usage: { inputTokens: 1, outputTokens: 1 } };
  };
  return provider;
};

function makeService(provider: LlmProvider, letterService?: ApplicationLetterService) {
  const llm = new LlmService({
    providers: [provider],
    defaultProvider: provider.id,
    logger: noopLogger,
  });
  const usageMeter = new InMemoryUsageMeter();
  const runner = new LlmFeatureRunner({
    llmService: llm,
    userRepository: new InMemoryUserRepository(),
    usageMeter,
    clock: new FixedClock(),
    logger: noopLogger,
  });
  const applications = new InMemoryJobApplicationRepository();
  const postings = new InMemoryJobPostingRepository();
  const documentRepo = new InMemoryDocumentRepository();
  const letterSvc =
    letterService ??
    new ApplicationLetterService({
      llmFeatureRunner: runner,
      jobApplicationRepository: applications,
      jobPostingRepository: postings,
    });
  const service = new MagicPenService({
    llmFeatureRunner: runner,
    jobApplicationRepository: applications,
    jobPostingRepository: postings,
    documentRepository: documentRepo,
    applicationLetterService: letterSvc,
  });
  return { service, applications, postings, documentRepo, usageMeter };
}

describe('MagicPenService.rewriteSection', () => {
  it('MagicPenService_NoProvider_ThrowsAiNotConfiguredAndMakesNoCall', async () => {
    const provider = new FakeLlmProvider('claude', false, 'unused');
    const { service, applications, postings } = makeService(provider);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));

    await expect(service.rewriteSection('team', 'u1', 'a1', 'summary')).rejects.toBeInstanceOf(
      AiNotConfiguredError,
    );
    expect(provider.calls).toBe(0);
  });

  it('MagicPenService_ProviderFails_ThrowsUpstreamProviderError', async () => {
    const provider = new FakeLlmProvider('claude', true, 'unused');
    provider.failWith = new Error('upstream down');
    const { service, applications, postings } = makeService(provider);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));

    await expect(service.rewriteSection('team', 'u1', 'a1', 'summary')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('MagicPenService_ReplyUnusableOrEmpty_ThrowsUpstreamProviderError', async () => {
    const provider = new FakeLlmProvider('claude', true, '{"text":""}');
    const { service, applications, postings } = makeService(provider);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));

    await expect(service.rewriteSection('team', 'u1', 'a1', 'summary')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('MagicPenService_ValidReply_ReturnsBeforeAfterProviderUsageGrounding', async () => {
    const provider = new FakeLlmProvider('claude', true, '{"text":"Tuned summary"}');
    const { service, applications, postings, documentRepo } = makeService(provider);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    await documentRepo.save(docs(['Rust']));

    const s = await service.rewriteSection('team', 'u1', 'a1', 'summary');
    expect(s.section).toBe('summary');
    expect(s.before).toBe('Backend engineer.');
    expect(s.after).toBe('Tuned summary');
    expect(s.provider).toBe('claude');
    expect(s.usage).toBeDefined();
    expect(s.grounding).toBeDefined();
  });

  it('MagicPenService_GroundsAgainstBaseCvNotCopy', async () => {
    // The copy already smuggled in "Kubernetes"; the base CV does not evidence it.
    const provider = new FakeLlmProvider('claude', true, '{"text":"I use Kubernetes daily."}');
    const { service, applications, postings, documentRepo } = makeService(provider);
    await applications.add(application('a1', docs(['Kubernetes'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    await documentRepo.save(docs(['Rust'])); // base CV: no Kubernetes

    const s = await service.rewriteSection('team', 'u1', 'a1', 'summary');
    expect(s.grounding.unsupported.some((u) => u.kind === 'skill' && u.text === 'kubernetes')).toBe(
      true,
    );
  });

  it('MagicPenService_BaseMissing_FallsBackToCopy', async () => {
    const provider = new FakeLlmProvider('claude', true, '{"text":"I use Kubernetes daily."}');
    const { service, applications, postings } = makeService(provider);
    await applications.add(application('a1', docs(['Kubernetes'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    // No base document row → grounding falls back to the copy, which has Kubernetes.

    const s = await service.rewriteSection('team', 'u1', 'a1', 'summary');
    expect(s.grounding.unsupported.filter((u) => u.kind === 'skill')).toEqual([]);
  });

  it('MagicPenService_UnknownApplication_ThrowsNotFound', async () => {
    const provider = new FakeLlmProvider('claude', true, '{}');
    const { service } = makeService(provider);
    await expect(service.rewriteSection('team', 'u1', 'missing', 'summary')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('MagicPenService_DeletedPosting_StillSuggests', async () => {
    // The ad text is lazy: a deleted posting yields '' and the call still runs.
    const provider = new FakeLlmProvider('claude', true, '{"text":"Tuned"}');
    const { service, applications } = makeService(provider);
    await applications.add(application('a1', docs(['Rust'])));
    // No posting row is added → description is ''.

    const s = await service.rewriteSection('team', 'u1', 'a1', 'summary');
    expect(s.after).toBe('Tuned');
  });

  it('MagicPenService_ExperienceIndexOutOfRange_ThrowsValidationError', async () => {
    const provider = new FakeLlmProvider('claude', true, '{}');
    const { service, applications, postings } = makeService(provider);
    await applications.add(application('a1', docs(['Rust']))); // exactly one station (index 0)
    await postings.add(posting('p1', 'We need a Rust engineer.'));

    await expect(
      service.rewriteSection('team', 'u1', 'a1', 'experienceBullets', { experienceIndex: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('MagicPenService_ExperienceWithoutIndex_DefaultsToZero', async () => {
    const provider = new FakeLlmProvider('claude', true, '{"bullets":["did the thing"]}');
    const { service, applications, postings } = makeService(provider);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));

    const s = await service.rewriteSection('team', 'u1', 'a1', 'experienceBullets');
    expect(s.experienceIndex).toBe(0);
    expect(s.station).toEqual({ role: 'Backend Engineer', company: 'Acme', period: '2018–2022' });
  });
});

describe('MagicPenService.rewriteAll', () => {
  it('MagicPenService_RewriteAll_FansOutAndMetersEachSection', async () => {
    const provider = schemaAwareProvider();
    const { service, applications, postings, documentRepo, usageMeter } = makeService(provider);
    const twoStations = docs(['Rust'], {
      experience: [
        {
          role: 'Backend Engineer',
          company: 'Acme',
          period: '2018–2022',
          location: '',
          bullets: ['Built APIs'],
          skills: [],
        },
        {
          role: 'Intern',
          company: 'Beta',
          period: '2017',
          location: '',
          bullets: ['Wrote tests'],
          skills: [],
        },
      ],
    });
    await applications.add(application('a1', twoStations));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    await documentRepo.save(docs(['Rust']));

    const result = await service.rewriteAll('team', 'u1', 'a1');
    const sections = result.sections.map((s) => ('section' in s ? s.section : s));
    expect(sections).toEqual(
      expect.arrayContaining(['headline', 'summary', 'experienceBullets', 'skills', 'letter']),
    );
    // One experienceBullets entry per station (ADR-0060 §3.2).
    expect(
      result.sections.filter((s) => 'section' in s && s.section === 'experienceBullets'),
    ).toHaveLength(2);
    // headline + summary + 2 stations + skills + letter = 6 entries.
    expect(result.sections).toHaveLength(6);
    // Every section is one metered call (AK-3.6).
    expect(usageMeter.events).toHaveLength(6);
  });

  it('MagicPenService_RewriteAll_PartialFailure_KeepsOthers', async () => {
    const provider = schemaAwareProvider();
    const original = provider.generate.bind(provider);
    let failed = false;
    provider.generate = async (input) => {
      // The first section call fails; the remaining five succeed (allSettled).
      if (!failed) {
        failed = true;
        throw new Error('upstream down');
      }
      return original(input);
    };
    const { service, applications, postings, documentRepo } = makeService(provider);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    await documentRepo.save(docs(['Rust']));

    const result = await service.rewriteAll('team', 'u1', 'a1');
    expect(result.sections).toHaveLength(5);
    const errors = result.sections.filter((s) => !('section' in s));
    expect(errors).toHaveLength(1);
    expect((errors[0] as { error: { type: string } }).error.type).toBe('upstream-provider');
    expect(result.sections.filter((s) => 'section' in s)).toHaveLength(4);
  });

  it('MagicPenService_LetterSlot_ReusesApplicationLetter', async () => {
    const provider = schemaAwareProvider();
    const { service, applications, postings, documentRepo } = makeService(provider);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    await documentRepo.save(docs(['Rust']));

    const result = await service.rewriteAll('team', 'u1', 'a1');
    const letter = result.sections.find((s) => 'section' in s && s.section === 'letter') as {
      before: string[];
      after: string[];
      checks: { mentionsCompany: boolean };
    };
    expect(letter.before).toEqual(['Old paragraph']);
    expect(letter.after).toEqual(['Dear team, I use Kubernetes daily.']);
    expect(letter.checks).toBeDefined();
  });

  it('MagicPenService_LetterSlot_GroundsAgainstCopyNotBase', async () => {
    // Base CV lacks Kubernetes; the copy has it. The letter slot grounds against
    // the COPY, so the "Kubernetes" claim is not flagged (Owner OQ1 asymmetry).
    const provider = schemaAwareProvider();
    const { service, applications, postings, documentRepo } = makeService(provider);
    await applications.add(application('a1', docs(['Kubernetes'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    await documentRepo.save(docs(['Rust'])); // base: no Kubernetes

    const result = await service.rewriteAll('team', 'u1', 'a1');
    const letter = result.sections.find((s) => 'section' in s && s.section === 'letter') as {
      grounding: { unsupported: Array<{ kind: string; text: string }> };
    };
    expect(
      letter.grounding.unsupported.filter((u) => u.kind === 'skill' && u.text === 'kubernetes'),
    ).toEqual([]);
  });

  it('MagicPenService_RewriteAll_NonDomainFailure_InternalErrorSlot', async () => {
    // A section that rejects with a plain (non-domain) error becomes an
    // `internal-error` slot, so the aggregate still survives.
    const provider = schemaAwareProvider();
    const letterService = {
      generate: async () => {
        throw new Error('boom');
      },
    } as unknown as ApplicationLetterService;
    const { service, applications, postings, documentRepo } = makeService(provider, letterService);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    await documentRepo.save(docs(['Rust']));

    const result = await service.rewriteAll('team', 'u1', 'a1');
    const letterError = result.sections.find((s) => !('section' in s)) as {
      error: { type: string; detail: string };
    };
    expect(letterError.error.type).toBe('internal-error');
    expect(letterError.error.detail).toBe('boom');
  });

  it('MagicPenService_RewriteAll_NonErrorRejection_StringDetail', async () => {
    // A rejection that is not an Error at all is still folded into a detail string.
    const provider = schemaAwareProvider();
    const letterService = {
      generate: async () => {
        throw 'plain failure';
      },
    } as unknown as ApplicationLetterService;
    const { service, applications, postings, documentRepo } = makeService(provider, letterService);
    await applications.add(application('a1', docs(['Rust'])));
    await postings.add(posting('p1', 'We need a Rust engineer.'));
    await documentRepo.save(docs(['Rust']));

    const result = await service.rewriteAll('team', 'u1', 'a1');
    const letterError = result.sections.find((s) => !('section' in s)) as {
      error: { type: string; detail: string };
    };
    expect(letterError.error.type).toBe('internal-error');
    expect(letterError.error.detail).toBe('plain failure');
  });
});
