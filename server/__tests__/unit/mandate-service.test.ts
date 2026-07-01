import { MandateService } from '../../src/services/mandate-service';
import { createMandateSchema, updateMandateSchema } from '../../src/domain/mandate';
import { NotFoundError } from '../../src/domain/errors';
import {
  InMemoryMandateRepository,
  InMemoryCandidacyRepository,
  FixedClock,
  SequenceIdGenerator,
} from '../support/fakes';

const OWNER = 'owner1';

function makeService() {
  const repo = new InMemoryMandateRepository();
  const candidacies = new InMemoryCandidacyRepository();
  const service = new MandateService({
    mandateRepository: repo,
    candidacyRepository: candidacies,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('mandate'),
  });
  return { service, repo, candidacies };
}

const validInput = {
  client: 'Aurora Systems GmbH',
  role: 'Senior C++ Engineer',
  location: 'Berlin · Hybrid',
};

describe('MandateService', () => {
  it('Create_PersistsWithIdDefaultsAndTimestamps', async () => {
    const { service, repo } = makeService();
    const created = await service.create(OWNER, createMandateSchema.parse(validInput));
    expect(created).toMatchObject({
      id: 'mandate1',
      ownerId: OWNER,
      client: 'Aurora Systems GmbH',
      role: 'Senior C++ Engineer',
      priority: 'medium',
      status: 'active',
      submitted: 0,
      interviews: 0,
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    });
    expect(repo.mandates).toHaveLength(1);
  });

  it('List_ReturnsOnlyOwnRows', async () => {
    const { service } = makeService();
    await service.create(OWNER, createMandateSchema.parse(validInput));
    await service.create(OWNER, createMandateSchema.parse({ ...validInput, role: 'DevOps' }));
    await service.create('other', createMandateSchema.parse({ ...validInput, role: 'QA' }));
    const mine = await service.list(OWNER);
    expect(mine).toHaveLength(2);
    expect(await service.list('other')).toHaveLength(1);
  });

  it('Get_Existing_Returns', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createMandateSchema.parse(validInput));
    expect(await service.get(OWNER, created.id)).toMatchObject({ id: created.id });
  });

  it('Get_OtherOwner_ThrowsNotFound', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createMandateSchema.parse(validInput));
    await expect(service.get('other', created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Get_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.get(OWNER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Update_Existing_AppliesPatchAndBumpsUpdatedAt', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createMandateSchema.parse(validInput));
    const updated = await service.update(
      OWNER,
      created.id,
      updateMandateSchema.parse({ status: 'paused', interviews: 2 }),
    );
    expect(updated).toMatchObject({ status: 'paused', interviews: 2 });
    expect(updated.role).toBe('Senior C++ Engineer'); // untouched fields kept
  });

  it('Update_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.update(OWNER, 'nope', { status: 'closed' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('Remove_Existing_Deletes', async () => {
    const { service, repo } = makeService();
    const created = await service.create(OWNER, createMandateSchema.parse(validInput));
    await service.remove(OWNER, created.id);
    expect(repo.mandates).toHaveLength(0);
  });

  it('Remove_OtherOwner_ThrowsNotFound', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createMandateSchema.parse(validInput));
    await expect(service.remove('other', created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Remove_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.remove(OWNER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
