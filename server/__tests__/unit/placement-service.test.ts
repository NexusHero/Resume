import { PlacementService } from '../../src/services/placement-service';
import { createPlacementSchema, updatePlacementSchema } from '../../src/domain/placement';
import { NotFoundError } from '../../src/domain/errors';
import { InMemoryPlacementRepository, FixedClock, SequenceIdGenerator } from '../support/fakes';

const OWNER = 'owner1';

function makeService() {
  const repo = new InMemoryPlacementRepository();
  const service = new PlacementService({
    placementRepository: repo,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('placement'),
  });
  return { service, repo };
}

const validInput = { candidateName: 'Mara Vogel', client: 'Aurora Systems GmbH' };

describe('PlacementService', () => {
  it('Create_PersistsWithIdDefaultsAndTimestamps', async () => {
    const { service, repo } = makeService();
    const created = await service.create(OWNER, createPlacementSchema.parse(validInput));
    expect(created).toMatchObject({
      id: 'placement1',
      ownerId: OWNER,
      candidateName: 'Mara Vogel',
      client: 'Aurora Systems GmbH',
      status: 'probation',
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    });
    expect(repo.placements).toHaveLength(1);
  });

  it('List_ReturnsOnlyOwnRows', async () => {
    const { service } = makeService();
    await service.create(OWNER, createPlacementSchema.parse(validInput));
    await service.create(
      OWNER,
      createPlacementSchema.parse({ ...validInput, candidateName: 'Lena' }),
    );
    await service.create(
      'other',
      createPlacementSchema.parse({ ...validInput, candidateName: 'Tom' }),
    );
    expect(await service.list(OWNER)).toHaveLength(2);
    expect(await service.list('other')).toHaveLength(1);
  });

  it('Get_Existing_Returns', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createPlacementSchema.parse(validInput));
    expect(await service.get(OWNER, created.id)).toMatchObject({ id: created.id });
  });

  it('Get_OtherOwner_ThrowsNotFound', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createPlacementSchema.parse(validInput));
    await expect(service.get('other', created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Get_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.get(OWNER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Update_Existing_AppliesPatchAndBumpsUpdatedAt', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createPlacementSchema.parse(validInput));
    const updated = await service.update(
      OWNER,
      created.id,
      updatePlacementSchema.parse({ status: 'paid' }),
    );
    expect(updated).toMatchObject({ status: 'paid', candidateName: 'Mara Vogel' });
  });

  it('Update_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.update(OWNER, 'nope', { status: 'paid' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('Remove_Existing_Deletes', async () => {
    const { service, repo } = makeService();
    const created = await service.create(OWNER, createPlacementSchema.parse(validInput));
    await service.remove(OWNER, created.id);
    expect(repo.placements).toHaveLength(0);
  });

  it('Remove_OtherOwner_ThrowsNotFound', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createPlacementSchema.parse(validInput));
    await expect(service.remove('other', created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Remove_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.remove(OWNER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
