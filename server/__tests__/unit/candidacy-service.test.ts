import { CandidacyService } from '../../src/services/candidacy-service';
import { NotFoundError, ConflictError } from '../../src/domain/errors';
import {
  InMemoryCandidacyRepository,
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  FixedClock,
  SequenceIdGenerator,
} from '../support/fakes';
import type { Talent } from '../../src/domain/talent';
import type { Mandate } from '../../src/domain/mandate';

const OWNER = 'owner1';

const talent = (id: string, ownerId = OWNER): Talent => ({
  id,
  ownerId,
  name: `Talent ${id}`,
  role: 'Engineer',
  headline: 'h',
  location: 'Berlin',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

const mandate = (id: string, ownerId = OWNER): Mandate => ({
  id,
  ownerId,
  client: 'Acme',
  role: 'Lead Engineer',
  location: 'Berlin',
  fee: '',
  feeValue: '',
  deadline: '',
  priority: 'medium',
  status: 'active',
  submitted: 0,
  interviews: 0,
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

function ctx() {
  const candidacies = new InMemoryCandidacyRepository();
  const mandates = new InMemoryMandateRepository();
  const talents = new InMemoryTalentRepository();
  const service = new CandidacyService({
    candidacyRepository: candidacies,
    mandateRepository: mandates,
    talentRepository: talents,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('cand'),
  });
  return { service, candidacies, mandates, talents };
}

describe('CandidacyService', () => {
  it('Add_LinksTalentToMandateWithCard', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: 'hi' });
    expect(card.mandateId).toBe('m1');
    expect(card.talentId).toBe('t1');
    expect(card.stage).toBe('sourced');
    expect(card.order).toBe(0);
    expect(card.talent?.name).toBe('Talent t1');
  });

  it('Add_SecondInSameStage_GetsNextOrder', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.talents.add(talent('t2'));
    await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    const second = await c.service.add(OWNER, 'm1', { talentId: 't2', stage: 'sourced', note: '' });
    expect(second.order).toBe(1);
  });

  it('Add_DuplicateTalent_Throws409', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    await expect(
      c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'screening', note: '' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('Add_UnknownMandate_Throws404', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(
      c.service.add(OWNER, 'missing', { talentId: 't1', stage: 'sourced', note: '' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Add_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await expect(
      c.service.add(OWNER, 'm1', { talentId: 'missing', stage: 'sourced', note: '' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Board_ReturnsCardsSortedByOrderWithTalent', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.talents.add(talent('t2'));
    await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    await c.service.add(OWNER, 'm1', { talentId: 't2', stage: 'interview', note: '' });
    const board = await c.service.board(OWNER, 'm1');
    expect(board).toHaveLength(2);
    expect(board.map((c2) => c2.order)).toEqual([0, 0]);
    expect(board[0]?.talent?.name).toBe('Talent t1');
  });

  it('Board_MissingTalent_YieldsNullTalent', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    await c.talents.remove(OWNER, 't1'); // talent gone, candidacy orphaned
    const board = await c.service.board(OWNER, 'm1');
    expect(board[0]?.talent).toBeNull();
  });

  it('Board_UnknownMandate_Throws404', async () => {
    const c = ctx();
    await expect(c.service.board(OWNER, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('ForTalent_ReturnsMandateSummaries', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    const list = await c.service.forTalent(OWNER, 't1');
    expect(list).toHaveLength(1);
    expect(list[0]?.mandate?.client).toBe('Acme');
  });

  it('ForTalent_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.forTalent(OWNER, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Update_MovesStageAndNote', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    const moved = await c.service.update(OWNER, card.id, { stage: 'offer', note: 'strong' });
    expect(moved.stage).toBe('offer');
    expect(moved.note).toBe('strong');
  });

  it('Update_UnknownCandidacy_Throws404', async () => {
    const c = ctx();
    await expect(c.service.update(OWNER, 'missing', { stage: 'offer' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('Remove_DropsCandidacy', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    await c.service.remove(OWNER, card.id);
    expect(await c.service.board(OWNER, 'm1')).toEqual([]);
  });

  it('Remove_UnknownCandidacy_Throws404', async () => {
    const c = ctx();
    await expect(c.service.remove(OWNER, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('OwnerScope_CannotSeeAnothersMandate', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1', 'other'));
    await expect(c.service.board(OWNER, 'm1')).rejects.toBeInstanceOf(NotFoundError);
  });
});
