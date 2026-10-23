import { SavedSearchService } from '../../src/services/saved-search-service.js';
import { JobSearchService } from '../../src/services/job-search-service.js';
import { createSavedSearchSchema } from '../../src/domain/saved-search.js';
import { NotFoundError } from '../../src/domain/errors.js';
import {
  InMemorySavedSearchRepository,
  FakeJobSource,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
  noopSkillExtractor,
} from '../support/fakes.js';

function makeService() {
  const repo = new InMemorySavedSearchRepository();
  const jobSearchService = new JobSearchService({
    jobSource: new FakeJobSource(),
    skillExtractor: noopSkillExtractor,
    candidateProfile: { skills: [{ name: 'Rust' }] },
    logger: noopLogger,
  });
  const service = new SavedSearchService({
    savedSearchRepository: repo,
    jobSearchService,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('search'),
  });
  return { service, repo };
}

describe('SavedSearchService', () => {
  it('Create_PersistsWithIdAndTimestamp', async () => {
    const { service, repo } = makeService();
    const saved = await service.create(
      'team',
      createSavedSearchSchema.parse({ name: 'Rust roles', q: 'Rust', threshold: 70 }),
    );
    expect(saved).toMatchObject({
      id: 'search1',
      ownerId: 'team',
      name: 'Rust roles',
      query: { q: 'Rust', threshold: 70 },
      createdAt: '2026-06-25T10:00:00.000Z',
    });
    expect(repo.searches).toHaveLength(1);
  });

  it('Create_DefaultsThreshold', async () => {
    const { service } = makeService();
    const saved = await service.create('team', createSavedSearchSchema.parse({ name: 'All' }));
    expect(saved.query.threshold).toBe(80);
  });

  it('List_ReturnsAllForScope', async () => {
    const { service } = makeService();
    await service.create('team', createSavedSearchSchema.parse({ name: 'A' }));
    await service.create('team', createSavedSearchSchema.parse({ name: 'B' }));
    expect(await service.list('team')).toHaveLength(2);
  });

  it('Remove_Existing_Deletes', async () => {
    const { service, repo } = makeService();
    const saved = await service.create('team', createSavedSearchSchema.parse({ name: 'A' }));
    await service.remove('team', saved.id);
    expect(repo.searches).toHaveLength(0);
  });

  it('Remove_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.remove('team', 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Run_Existing_DelegatesToJobSearchWithStoredQuery', async () => {
    const { service } = makeService();
    const saved = await service.create(
      'team',
      createSavedSearchSchema.parse({ name: 'Rust', q: 'Rust', threshold: 60 }),
    );
    const result = await service.run('team', saved.id);
    expect(result.threshold).toBe(60);
    expect(result.query.q).toBe('Rust');
  });

  it('Run_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.run('team', 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  // RI15/Q6 — workspace scope
  it('List_FiltersByScope', async () => {
    const { service } = makeService();
    await service.create('team', createSavedSearchSchema.parse({ name: 'A' }));
    await service.create('other', createSavedSearchSchema.parse({ name: 'B' }));
    expect((await service.list('team')).map((s) => s.name)).toEqual(['A']);
  });

  it('Create_SetsOwnerIdFromScope', async () => {
    const { service } = makeService();
    const saved = await service.create('acme', createSavedSearchSchema.parse({ name: 'X' }));
    expect(saved.ownerId).toBe('acme');
  });

  it('Remove_OnlyOwned', async () => {
    const { service, repo } = makeService();
    const saved = await service.create('team', createSavedSearchSchema.parse({ name: 'A' }));
    await expect(service.remove('other', saved.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.searches).toHaveLength(1);
  });

  it('Run_OnlyOwned', async () => {
    const { service } = makeService();
    const saved = await service.create('team', createSavedSearchSchema.parse({ name: 'A' }));
    await expect(service.run('other', saved.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
