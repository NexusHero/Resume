import { PlacementService } from '../../src/services/placement-service';
import { createPlacementSchema, updatePlacementSchema } from '../../src/domain/placement';
import { NotFoundError } from '../../src/domain/errors';
import { InMemoryPlacementRepository, FixedClock, SequenceIdGenerator } from '../support/fakes';

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
    const created = await service.create(createPlacementSchema.parse(validInput));
    expect(created).toMatchObject({
      id: 'placement1',
      candidateName: 'Mara Vogel',
      client: 'Aurora Systems GmbH',
      status: 'probation',
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    });
    expect(repo.placements).toHaveLength(1);
  });

  it('List_ReturnsAll', async () => {
    const { service } = makeService();
    await service.create(createPlacementSchema.parse(validInput));
    await service.create(createPlacementSchema.parse({ ...validInput, candidateName: 'Lena' }));
    expect(await service.list()).toHaveLength(2);
  });

  it('Get_Existing_Returns', async () => {
    const { service } = makeService();
    const created = await service.create(createPlacementSchema.parse(validInput));
    expect(await service.get(created.id)).toMatchObject({ id: created.id });
  });

  it('Get_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Update_Existing_AppliesPatchAndBumpsUpdatedAt', async () => {
    const { service } = makeService();
    const created = await service.create(createPlacementSchema.parse(validInput));
    const updated = await service.update(
      created.id,
      updatePlacementSchema.parse({ status: 'paid' }),
    );
    expect(updated).toMatchObject({ status: 'paid', candidateName: 'Mara Vogel' });
  });

  it('Update_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.update('nope', { status: 'paid' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Remove_Existing_Deletes', async () => {
    const { service, repo } = makeService();
    const created = await service.create(createPlacementSchema.parse(validInput));
    await service.remove(created.id);
    expect(repo.placements).toHaveLength(0);
  });

  it('Remove_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
