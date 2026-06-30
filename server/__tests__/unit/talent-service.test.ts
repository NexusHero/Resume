import { TalentService } from '../../src/services/talent-service';
import { createTalentSchema, updateTalentSchema } from '../../src/domain/talent';
import { NotFoundError } from '../../src/domain/errors';
import { InMemoryTalentRepository, FixedClock, SequenceIdGenerator } from '../support/fakes';

function makeService() {
  const repo = new InMemoryTalentRepository();
  const service = new TalentService({
    talentRepository: repo,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('talent'),
  });
  return { service, repo };
}

const validInput = { name: 'Lena Brandt', role: 'Product Designer' };

describe('TalentService', () => {
  it('Create_PersistsWithIdDefaultsAndTimestamps', async () => {
    const { service, repo } = makeService();
    const created = await service.create(createTalentSchema.parse(validInput));
    expect(created).toMatchObject({
      id: 'talent1',
      name: 'Lena Brandt',
      role: 'Product Designer',
      skills: [],
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    });
    expect(repo.talents).toHaveLength(1);
  });

  it('Create_KeepsProvidedSkills', async () => {
    const { service } = makeService();
    const created = await service.create(
      createTalentSchema.parse({ name: 'Marco', skills: ['Go', 'AWS'] }),
    );
    expect(created.skills).toEqual(['Go', 'AWS']);
  });

  it('List_ReturnsAll', async () => {
    const { service } = makeService();
    await service.create(createTalentSchema.parse({ name: 'A' }));
    await service.create(createTalentSchema.parse({ name: 'B' }));
    expect(await service.list()).toHaveLength(2);
  });

  it('Get_Existing_Returns', async () => {
    const { service } = makeService();
    const created = await service.create(createTalentSchema.parse(validInput));
    expect(await service.get(created.id)).toMatchObject({ id: created.id });
  });

  it('Get_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Update_Existing_AppliesPatchAndBumpsUpdatedAt', async () => {
    const { service } = makeService();
    const created = await service.create(createTalentSchema.parse(validInput));
    const updated = await service.update(
      created.id,
      updateTalentSchema.parse({ availability: 'immediately' }),
    );
    expect(updated).toMatchObject({ availability: 'immediately', name: 'Lena Brandt' });
  });

  it('Update_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.update('nope', { role: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Remove_Existing_Deletes', async () => {
    const { service, repo } = makeService();
    const created = await service.create(createTalentSchema.parse(validInput));
    await service.remove(created.id);
    expect(repo.talents).toHaveLength(0);
  });

  it('Remove_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
