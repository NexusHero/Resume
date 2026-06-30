import { MandateService } from '../../src/services/mandate-service';
import { createMandateSchema, updateMandateSchema } from '../../src/domain/mandate';
import { NotFoundError } from '../../src/domain/errors';
import { InMemoryMandateRepository, FixedClock, SequenceIdGenerator } from '../support/fakes';

function makeService() {
  const repo = new InMemoryMandateRepository();
  const service = new MandateService({
    mandateRepository: repo,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('mandate'),
  });
  return { service, repo };
}

const validInput = {
  client: 'Aurora Systems GmbH',
  role: 'Senior C++ Engineer',
  location: 'Berlin · Hybrid',
};

describe('MandateService', () => {
  it('Create_PersistsWithIdDefaultsAndTimestamps', async () => {
    const { service, repo } = makeService();
    const created = await service.create(createMandateSchema.parse(validInput));
    expect(created).toMatchObject({
      id: 'mandate1',
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

  it('List_ReturnsAll', async () => {
    const { service } = makeService();
    await service.create(createMandateSchema.parse(validInput));
    await service.create(createMandateSchema.parse({ ...validInput, role: 'DevOps' }));
    expect(await service.list()).toHaveLength(2);
  });

  it('Get_Existing_Returns', async () => {
    const { service } = makeService();
    const created = await service.create(createMandateSchema.parse(validInput));
    expect(await service.get(created.id)).toMatchObject({ id: created.id });
  });

  it('Get_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Update_Existing_AppliesPatchAndBumpsUpdatedAt', async () => {
    const { service } = makeService();
    const created = await service.create(createMandateSchema.parse(validInput));
    const updated = await service.update(
      created.id,
      updateMandateSchema.parse({ status: 'paused', interviews: 2 }),
    );
    expect(updated).toMatchObject({ status: 'paused', interviews: 2 });
    expect(updated.role).toBe('Senior C++ Engineer'); // untouched fields kept
  });

  it('Update_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.update('nope', { status: 'closed' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('Remove_Existing_Deletes', async () => {
    const { service, repo } = makeService();
    const created = await service.create(createMandateSchema.parse(validInput));
    await service.remove(created.id);
    expect(repo.mandates).toHaveLength(0);
  });

  it('Remove_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
