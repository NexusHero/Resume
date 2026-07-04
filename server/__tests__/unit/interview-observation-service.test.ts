import { InterviewObservationService } from '../../src/services/interview-observation-service.js';
import { NotFoundError } from '../../src/domain/errors.js';
import {
  InMemoryInterviewObservationRepository,
  InMemoryMandateRepository,
  FixedClock,
  SequenceIdGenerator,
} from '../support/fakes.js';
import type { Mandate } from '../../src/domain/mandate.js';

const SCOPE = 'team';

const mandate = (id: string, client = 'Google Germany GmbH'): Mandate => ({
  id,
  ownerId: SCOPE,
  client,
  role: 'Engineer',
  location: 'Berlin',
  fee: '',
  feeValue: '',
  deadline: '',
  priority: 'medium',
  status: 'active',
  submitted: 0,
  interviews: 0,
  jobText: '',
  lang: 'en',
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

function ctx() {
  const repo = new InMemoryInterviewObservationRepository();
  const mandates = new InMemoryMandateRepository();
  const service = new InterviewObservationService({
    interviewObservationRepository: repo,
    mandateRepository: mandates,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('obs'),
  });
  return { service, repo, mandates };
}

describe('InterviewObservationService', () => {
  it('Record_UnknownMandate_Throws404', async () => {
    const c = ctx();
    await expect(
      c.service.record(SCOPE, 'missing', {
        talentId: '',
        rounds: 3,
        formats: ['coding'],
        difficulty: 'high',
        notes: '',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Record_DerivesCompanyKeyFromMandateClient', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1', 'Google Germany GmbH'));
    const o = await c.service.record(SCOPE, 'm1', {
      talentId: 't1',
      rounds: 4,
      formats: ['coding', 'system_design'],
      difficulty: 'high',
      notes: 'tough',
    });
    expect(o.companyKey).toBe('google germany');
    expect(o.company).toBe('Google Germany GmbH');
    expect(o.rounds).toBe(4);
  });

  it('ForMandate_NoObservations_ProfileNull', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    const k = await c.service.forMandate(SCOPE, 'm1');
    expect(k.profile).toBeNull();
    expect(k.observations).toEqual([]);
    expect(k.company).toBe('Google Germany GmbH');
  });

  it('ForMandate_AggregatesRecordedObservations', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    for (let i = 0; i < 3; i++) {
      await c.service.record(SCOPE, 'm1', {
        talentId: '',
        rounds: 4,
        formats: ['coding'],
        difficulty: 'high',
        notes: '',
      });
    }
    const k = await c.service.forMandate(SCOPE, 'm1');
    expect(k.profile?.sampleSize).toBe(3);
    expect(k.profile?.confidence).toBe('medium');
    expect(k.profile?.formats[0]?.format).toBe('coding');
  });

  it('ForMandate_ScopedToTheCompanyOfThatMandate', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1', 'Google'));
    await c.mandates.add(mandate('m2', 'SAP'));
    await c.service.record(SCOPE, 'm1', {
      talentId: '',
      rounds: 4,
      formats: ['coding'],
      difficulty: 'high',
      notes: '',
    });
    expect((await c.service.forMandate(SCOPE, 'm2')).profile).toBeNull(); // different company
  });
});
