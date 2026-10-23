import { JobPostingService, type GetPosting } from '../../src/services/job-posting-service.js';
import { adoptJobPostingSchema, createJobPostingSchema } from '../../src/domain/job-posting.js';
import { NotFoundError, PostingFetchError } from '../../src/domain/errors.js';
import { InMemoryJobPostingRepository, FixedClock, SequenceIdGenerator } from '../support/fakes.js';

function makeService(getPosting: GetPosting = async () => null) {
  const repo = new InMemoryJobPostingRepository();
  const service = new JobPostingService({
    jobPostingRepository: repo,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('post'),
    getPosting,
  });
  return { service, repo };
}

const detail = (description: string) => async () => ({ description });

describe('JobPostingService — adopt', () => {
  it('Adopt_StoresPostingWithFullDescriptionAndRequirements', async () => {
    const { service, repo } = makeService(detail('Full ad text here.'));
    const { jobPosting, alreadySaved } = await service.adopt(
      'team',
      adoptJobPostingSchema.parse({
        source: 'Arbeitnow',
        sourceId: 'slug-1',
        url: 'https://Example.com/job/',
        company: 'Acme',
        title: 'Senior C++ Engineer',
        location: 'Berlin',
        country: 'DE',
        requirements: ['Rust', 'gRPC'],
      }),
    );
    expect(alreadySaved).toBe(false);
    expect(jobPosting).toMatchObject({
      ownerId: 'team',
      source: 'Arbeitnow',
      sourceId: 'slug-1',
      url: 'https://example.com/job', // normalised once (host case + trailing slash)
      company: 'Acme',
      title: 'Senior C++ Engineer',
      description: 'Full ad text here.',
      requirements: ['Rust', 'gRPC'],
      descriptionIncomplete: false,
    });
    expect(repo.postings).toHaveLength(1);
  });

  it('Adopt_SourceWithoutDetail_StoresIncompleteAndFlagsIt', async () => {
    const { service } = makeService(async () => null);
    const { jobPosting } = await service.adopt(
      'team',
      adoptJobPostingSchema.parse({
        source: 'Adzuna',
        sourceId: '123',
        company: 'Acme',
        title: 'Engineer',
      }),
    );
    expect(jobPosting.description).toBe('');
    expect(jobPosting.descriptionIncomplete).toBe(true);
  });

  it('Adopt_SameSourceAndSourceId_ReturnsExistingWithAlreadySaved', async () => {
    const { service, repo } = makeService(detail('Full text'));
    const input = () =>
      adoptJobPostingSchema.parse({
        source: 'Arbeitnow',
        sourceId: 'slug-1',
        company: 'Acme',
        title: 'Engineer',
      });
    const first = await service.adopt('team', input());
    const second = await service.adopt('team', input());
    expect(first.alreadySaved).toBe(false);
    expect(second.alreadySaved).toBe(true);
    expect(second.jobPosting.id).toBe(first.jobPosting.id);
    expect(repo.postings).toHaveLength(1);
  });

  it('Adopt_SameUrl_ReturnsExistingWithAlreadySaved', async () => {
    const { service, repo } = makeService();
    await service.adopt(
      'team',
      adoptJobPostingSchema.parse({
        source: 'A',
        url: 'https://x.test/job',
        company: 'A',
        title: 'T',
      }),
    );
    const second = await service.adopt(
      'team',
      adoptJobPostingSchema.parse({
        source: 'B',
        url: 'https://x.test/job',
        company: 'B',
        title: 'T',
      }),
    );
    expect(second.alreadySaved).toBe(true);
    expect(second.jobPosting.source).toBe('A');
    expect(repo.postings).toHaveLength(1);
  });

  it('Adopt_DifferentWorkspaceSamePosting_CreatesSeparately', async () => {
    const { service } = makeService(detail('Full text'));
    const input = () =>
      adoptJobPostingSchema.parse({
        source: 'Arbeitnow',
        sourceId: 'slug-1',
        company: 'Acme',
        title: 'Engineer',
      });
    const a = await service.adopt('team', input());
    const b = await service.adopt('other', input());
    expect(a.jobPosting.id).not.toBe(b.jobPosting.id);
    expect(b.alreadySaved).toBe(false);
  });

  it('Adopt_UnknownSource_ThrowsNotFound', async () => {
    const { service } = makeService(async () => {
      throw new NotFoundError('Unknown job source Nope');
    });
    await expect(
      service.adopt(
        'team',
        adoptJobPostingSchema.parse({ source: 'Nope', sourceId: '1', company: 'A', title: 'T' }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Adopt_DetailFetchFails_ThrowsPostingFetch', async () => {
    const { service } = makeService(async () => {
      throw new PostingFetchError('detail-fetch');
    });
    await expect(
      service.adopt(
        'team',
        adoptJobPostingSchema.parse({
          source: 'Arbeitnow',
          sourceId: '1',
          company: 'A',
          title: 'T',
        }),
      ),
    ).rejects.toBeInstanceOf(PostingFetchError);
  });

  it('Adopt_OnlyUrlWithoutSourceId_StoresIncomplete', async () => {
    const { service } = makeService();
    const { jobPosting } = await service.adopt(
      'team',
      adoptJobPostingSchema.parse({
        source: 'url',
        url: 'https://x.test/job',
        company: 'A',
        title: 'T',
      }),
    );
    // no sourceId → no detail lookup possible
    expect(jobPosting.description).toBe('');
    expect(jobPosting.descriptionIncomplete).toBe(true);
  });
});

describe('JobPostingService — create / update / delete / list', () => {
  it('Create_EditDraft_Persists', async () => {
    const { service, repo } = makeService();
    const { jobPosting, alreadySaved } = await service.create(
      'team',
      createJobPostingSchema.parse({
        source: 'text',
        company: 'Acme',
        title: 'Engineer',
        location: 'Berlin',
        country: 'DE',
        description: 'A long ad text.',
        requirements: ['Rust'],
      }),
    );
    expect(alreadySaved).toBe(false);
    expect(jobPosting.description).toBe('A long ad text.');
    expect(jobPosting.descriptionIncomplete).toBe(false);
    expect(repo.postings).toHaveLength(1);
  });

  it('Create_DuplicateUrl_ReturnsAlreadySaved', async () => {
    const { service } = makeService();
    const draft = () =>
      createJobPostingSchema.parse({
        source: 'url',
        url: 'https://Example.com/job/',
        company: 'Acme',
        title: 'Engineer',
        description: 'x',
      });
    const first = await service.create('team', draft());
    const second = await service.create('team', draft());
    expect(first.alreadySaved).toBe(false);
    expect(second.alreadySaved).toBe(true);
  });

  it('Update_CompletesDescription_ResetsIncompleteFlag', async () => {
    const { service } = makeService();
    const { jobPosting } = await service.adopt(
      'team',
      adoptJobPostingSchema.parse({ source: 'Adzuna', sourceId: '1', company: 'A', title: 'T' }),
    );
    expect(jobPosting.descriptionIncomplete).toBe(true);
    const updated = await service.update('team', jobPosting.id, { description: 'Now full text.' });
    expect(updated.description).toBe('Now full text.');
    expect(updated.descriptionIncomplete).toBe(false);
  });

  it('Update_EmptyDescriptionHonorsExplicitIncompleteFlag', async () => {
    const { service } = makeService();
    const { jobPosting } = await service.create(
      'team',
      createJobPostingSchema.parse({
        source: 'text',
        company: 'A',
        title: 'T',
        description: 'Has text.',
      }),
    );
    expect(jobPosting.descriptionIncomplete).toBe(false);
    const updated = await service.update('team', jobPosting.id, {
      description: '',
      descriptionIncomplete: true,
    });
    // empty description → the reset rule is skipped, so the explicit flag survives
    expect(updated.descriptionIncomplete).toBe(true);
  });

  it('Update_AppliesAllEditableFields', async () => {
    const { service } = makeService();
    const { jobPosting } = await service.create(
      'team',
      createJobPostingSchema.parse({ source: 'text', company: 'A', title: 'T' }),
    );
    const updated = await service.update('team', jobPosting.id, {
      company: 'New Co',
      title: 'New Title',
      location: 'Bonn',
      country: 'DE',
      description: 'New description.',
      requirements: ['Go'],
      descriptionIncomplete: false,
    });
    expect(updated).toMatchObject({
      company: 'New Co',
      title: 'New Title',
      location: 'Bonn',
      country: 'DE',
      description: 'New description.',
      requirements: ['Go'],
    });
  });

  it('Get_ReturnsOwnedPosting', async () => {
    const { service } = makeService();
    const { jobPosting } = await service.create(
      'team',
      createJobPostingSchema.parse({ source: 'text', company: 'A', title: 'T' }),
    );
    await expect(service.get('team', jobPosting.id)).resolves.toMatchObject({
      id: jobPosting.id,
      company: 'A',
    });
  });

  it('Get_ForeignId_ThrowsNotFound', async () => {
    const { service } = makeService();
    const { jobPosting } = await service.create(
      'team',
      createJobPostingSchema.parse({ source: 'text', company: 'A', title: 'T' }),
    );
    await expect(service.get('other', jobPosting.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Delete_RemovesOnlyOwnedPosting', async () => {
    const { service, repo } = makeService();
    const { jobPosting } = await service.create(
      'team',
      createJobPostingSchema.parse({ source: 'text', company: 'A', title: 'T' }),
    );
    await expect(service.delete('other', jobPosting.id)).rejects.toBeInstanceOf(NotFoundError);
    await service.delete('team', jobPosting.id);
    expect(repo.postings).toHaveLength(0);
  });

  it('List_SearchFilterMatchesCompanyTitleLocationDescription', async () => {
    const { service } = makeService();
    await service.create(
      'team',
      createJobPostingSchema.parse({
        source: 'text',
        company: 'Acme Corp',
        title: 'Backend Engineer',
        location: 'Berlin',
        description: 'Distributed systems at scale.',
      }),
    );
    await service.create(
      'team',
      createJobPostingSchema.parse({
        source: 'text',
        company: 'Globex',
        title: 'Frontend Developer',
        location: 'Hamburg',
        description: 'React and TypeScript.',
      }),
    );
    expect((await service.list('team', 'acme')).map((p) => p.company)).toEqual(['Acme Corp']);
    expect((await service.list('team', 'frontend')).map((p) => p.company)).toEqual(['Globex']);
    expect((await service.list('team', 'hamburg')).map((p) => p.company)).toEqual(['Globex']);
    expect((await service.list('team', 'distributed')).map((p) => p.company)).toEqual([
      'Acme Corp',
    ]);
  });

  it('List_NewestFirst', async () => {
    const { service, repo } = makeService();
    await service.create(
      'team',
      createJobPostingSchema.parse({ source: 'text', company: 'A', title: 'T' }),
    );
    // backdate the first so a second, newer posting sorts first
    repo.postings[0]!.createdAt = '2026-06-01T00:00:00.000Z';
    await service.create(
      'team',
      createJobPostingSchema.parse({ source: 'text', company: 'B', title: 'T' }),
    );
    expect((await service.list('team')).map((p) => p.company)).toEqual(['B', 'A']);
  });
});
