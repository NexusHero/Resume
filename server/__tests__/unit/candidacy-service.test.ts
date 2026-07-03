import { CandidacyService } from '../../src/services/candidacy-service';
import { PlacementService } from '../../src/services/placement-service';
import { NotFoundError, ConflictError } from '../../src/domain/errors';
import {
  InMemoryCandidacyRepository,
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryPlacementRepository,
  FixedClock,
  SequenceIdGenerator,
  InMemoryStageTransitionRepository,
  noopLogger,
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

function ctx(failTransitionsWith?: Error) {
  const candidacies = new InMemoryCandidacyRepository();
  const mandates = new InMemoryMandateRepository();
  const talents = new InMemoryTalentRepository();
  const placements = new InMemoryPlacementRepository();
  const placementService = new PlacementService({
    placementRepository: placements,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('placement'),
  });
  const transitions = new InMemoryStageTransitionRepository(failTransitionsWith);
  const service = new CandidacyService({
    candidacyRepository: candidacies,
    mandateRepository: mandates,
    talentRepository: talents,
    placementService,
    stageTransitionRepository: transitions,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('cand'),
    logger: noopLogger,
  });
  return { service, candidacies, mandates, talents, placements, transitions };
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

  it('Update_ToPlaced_BooksPlacementFromFacts', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'offer', note: '' });
    await c.service.update(OWNER, card.id, { stage: 'placed' });
    const placements = await c.placements.list(OWNER);
    expect(placements).toHaveLength(1);
    expect(placements[0]).toMatchObject({
      candidateName: 'Talent t1',
      client: 'Acme',
      status: 'probation',
    });
  });

  it('Update_ToPlaced_OrphanedTalent_SkipsBooking', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'offer', note: '' });
    await c.talents.remove(OWNER, 't1'); // orphan the candidacy before it's placed
    await c.service.update(OWNER, card.id, { stage: 'placed' });
    expect(await c.placements.list(OWNER)).toEqual([]);
  });

  it('Update_PlacedTwice_DoesNotDoubleBook', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'offer', note: '' });
    await c.service.update(OWNER, card.id, { stage: 'placed' });
    await c.service.update(OWNER, card.id, { note: 'signed' }); // still placed, no new booking
    expect(await c.placements.list(OWNER)).toHaveLength(1);
  });

  it('Update_PlacedAgainAfterMovingOut_BooksOnceMore', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'offer', note: '' });
    await c.service.update(OWNER, card.id, { stage: 'placed' });
    await c.service.update(OWNER, card.id, { stage: 'offer' });
    await c.service.update(OWNER, card.id, { stage: 'placed' });
    expect(await c.placements.list(OWNER)).toHaveLength(2);
  });

  it('MandateCounters_TrackBoardStages', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.talents.add(talent('t2'));
    await c.talents.add(talent('t3'));
    // sourced does not count as submitted; screening does
    await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    const cardB = await c.service.add(OWNER, 'm1', {
      talentId: 't2',
      stage: 'screening',
      note: '',
    });
    await c.service.add(OWNER, 'm1', { talentId: 't3', stage: 'interview', note: '' });
    let m = await c.mandates.findById(OWNER, 'm1');
    expect(m?.submitted).toBe(2); // screening + interview
    expect(m?.interviews).toBe(1); // interview only
    // advancing t2 to interview bumps interviews
    await c.service.update(OWNER, cardB.id, { stage: 'interview' });
    m = await c.mandates.findById(OWNER, 'm1');
    expect(m?.interviews).toBe(2);
  });

  it('MandateCounters_DecrementOnRemove', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'interview', note: '' });
    expect((await c.mandates.findById(OWNER, 'm1'))?.interviews).toBe(1);
    await c.service.remove(OWNER, card.id);
    const m = await c.mandates.findById(OWNER, 'm1');
    expect(m?.submitted).toBe(0);
    expect(m?.interviews).toBe(0);
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

describe('CandidacyService stage-transition log (ADR-0016)', () => {
  it('Add_LogsEntryTransitionWithNullFrom', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'screening', note: '' });
    expect(c.transitions.rows).toHaveLength(1);
    expect(c.transitions.rows[0]).toMatchObject({
      mandateId: 'm1',
      talentId: 't1',
      from: null,
      to: 'screening',
    });
  });

  it('Update_StageMove_LogsFromAndTo', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    await c.service.update(OWNER, card.id, { stage: 'interview' });
    expect(c.transitions.rows.map((t) => `${t.from}->${t.to}`)).toEqual([
      'null->sourced',
      'sourced->interview',
    ]);
  });

  it('Update_ReorderOrNoteOnly_LogsNothing', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    await c.service.update(OWNER, card.id, { order: 3, note: 'call tomorrow' });
    expect(c.transitions.rows).toHaveLength(1); // only the add
  });

  it('Logging_Failure_NeverBreaksThePipelineAction', async () => {
    const c = ctx(new Error('disk full'));
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const card = await c.service.add(OWNER, 'm1', { talentId: 't1', stage: 'sourced', note: '' });
    const moved = await c.service.update(OWNER, card.id, { stage: 'offer' });
    expect(moved.stage).toBe('offer');
    expect(c.transitions.rows).toEqual([]);
  });
});
