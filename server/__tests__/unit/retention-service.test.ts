import { RetentionService } from '../../src/services/retention-service';
import { ANONYMIZED_NAME } from '../../src/domain/talent';
import { NotFoundError } from '../../src/domain/errors';
import {
  emptyContact,
  emptyResume,
  emptyLetter,
  defaultStyle,
} from '../../src/domain/talent-documents';
import {
  InMemoryTalentRepository,
  InMemoryCandidacyRepository,
  InMemoryDocumentRepository,
  InMemoryAttachmentStore,
  FixedClock,
  InMemoryRetentionPolicyStore,
  noopLogger,
} from '../support/fakes';
import type { Talent } from '../../src/domain/talent';
import type { Attachment } from '../../src/domain/attachment';

const SCOPE = 'team';
const NOW = '2026-06-25T10:00:00.000Z';

const talent = (id: string, over: Partial<Talent> = {}): Talent => ({
  id,
  ownerId: SCOPE,
  name: `Talent ${id}`,
  role: 'Engineer',
  headline: 'h',
  location: 'Berlin',
  email: `${id}@x.de`,
  phone: '123',
  availability: 'now',
  salary: '80k',
  skills: ['C++'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
  ...over,
});

const attachment = (id: string, talentId: string): Attachment => ({
  id,
  ownerId: SCOPE,
  talentId,
  name: 'cv.pdf',
  contentType: 'application/pdf',
  size: 3,
  createdAt: NOW,
});

function ctx() {
  const talents = new InMemoryTalentRepository();
  const candidacies = new InMemoryCandidacyRepository();
  const documents = new InMemoryDocumentRepository();
  const attachments = new InMemoryAttachmentStore();
  const policies = new InMemoryRetentionPolicyStore();
  const service = new RetentionService({
    talentRepository: talents,
    candidacyRepository: candidacies,
    documentRepository: documents,
    attachmentStore: attachments,
    retentionPolicyStore: policies,
    clock: new FixedClock(NOW),
    logger: noopLogger,
  });
  return { service, talents, candidacies, documents, attachments, policies };
}

describe('RetentionService', () => {
  it('Report_ListsInactiveCandidates', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.talents.add(talent('t2', { updatedAt: NOW })); // fresh
    const report = await c.service.report(SCOPE, 0); // any inactivity counts
    expect(report.map((r) => r.talentId).sort()).toEqual(['t1', 't2']);
    expect(report[0]).toHaveProperty('inactiveDays');
  });

  it('Report_DefaultWindow_IncludesLongInactive', async () => {
    const c = ctx();
    await c.talents.add(talent('t1')); // updatedAt 2024-06-01, clock 2026 → ~2y inactive
    const report = await c.service.report(SCOPE); // default 180-day window
    expect(report.map((r) => r.talentId)).toEqual(['t1']);
  });

  it('Report_ExcludesActivePipeline', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.candidacies.add({
      id: 'c1',
      ownerId: SCOPE,
      mandateId: 'm1',
      talentId: 't1',
      stage: 'interview',
      note: '',
      order: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(await c.service.report(SCOPE, 0)).toEqual([]);
  });

  it('Anonymize_ClearsTalentPiiDocContactAndAttachments', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.documents.save({
      ownerId: SCOPE,
      talentId: 't1',
      contact: { ...emptyContact, name: 'Max', email: 'max@x.de' },
      resume: emptyResume,
      letter: emptyLetter,
      style: defaultStyle,
      updatedAt: NOW,
    });
    await c.attachments.add(attachment('a1', 't1'), Buffer.from('pdf'));

    const result = await c.service.anonymize(SCOPE, 't1');

    expect(result.name).toBe(ANONYMIZED_NAME);
    expect(result.email).toBe('');
    expect(result.anonymizedAt).toBe(NOW);
    // persisted
    expect((await c.talents.findById(SCOPE, 't1'))?.name).toBe(ANONYMIZED_NAME);
    // document contact cleared
    expect((await c.documents.get(SCOPE, 't1'))?.contact.name).toBe('');
    expect((await c.documents.get(SCOPE, 't1'))?.contact.email).toBe('');
    // raw attachments (CVs) removed
    expect(await c.attachments.list(SCOPE, 't1')).toEqual([]);
  });

  it('Anonymize_Idempotent_KeepsFirstTimestamp', async () => {
    const c = ctx();
    await c.talents.add(talent('t1', { anonymizedAt: '2025-01-01T00:00:00.000Z' }));
    const result = await c.service.anonymize(SCOPE, 't1');
    expect(result.anonymizedAt).toBe('2025-01-01T00:00:00.000Z'); // unchanged
  });

  it('Anonymize_NoDocuments_StillSucceeds', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const result = await c.service.anonymize(SCOPE, 't1');
    expect(result.name).toBe(ANONYMIZED_NAME);
  });

  it('Anonymize_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.anonymize(SCOPE, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('RetentionService policy + Löschfristen-Automatik (ADR-0018)', () => {
  it('GetPolicy_DefaultsUntilStored', async () => {
    const c = ctx();
    expect(await c.service.getPolicy(SCOPE)).toEqual({
      reviewDays: 180,
      deletionDays: 365,
      autoAnonymize: false,
    });
  });

  it('UpdatePolicy_PersistsAndClampsReviewToDeletion', async () => {
    const c = ctx();
    const saved = await c.service.updatePolicy(SCOPE, { deletionDays: 90, reviewDays: 200 });
    // review may never fire after the deletion deadline
    expect(saved).toEqual({ reviewDays: 90, deletionDays: 90, autoAnonymize: false });
    expect(await c.service.getPolicy(SCOPE)).toEqual(saved);
  });

  it('Report_FlagsOverduePastDeletionDeadline', async () => {
    const c = ctx();
    await c.service.updatePolicy(SCOPE, { reviewDays: 30, deletionDays: 365 });
    // ~400 days inactive → overdue; ~60 days → due for review but not overdue
    await c.talents.add(talent('old', { updatedAt: '2025-05-21T10:00:00.000Z' }));
    await c.talents.add(talent('mid', { updatedAt: '2026-04-26T10:00:00.000Z' }));
    const report = await c.service.report(SCOPE);
    const byId = Object.fromEntries(report.map((r) => [r.talentId, r.overdue]));
    expect(byId.old).toBe(true);
    expect(byId.mid).toBe(false);
  });

  it('AnonymizeOverdue_ClearsOnlyPastDeadline_Idempotent', async () => {
    const c = ctx();
    await c.service.updatePolicy(SCOPE, { reviewDays: 30, deletionDays: 365 });
    await c.talents.add(talent('old', { updatedAt: '2025-05-21T10:00:00.000Z' }));
    await c.talents.add(talent('mid', { updatedAt: '2026-04-26T10:00:00.000Z' }));
    const first = await c.service.anonymizeOverdue(SCOPE);
    expect(first).toEqual({ overdue: 1, anonymized: 1, talentIds: ['old'] });
    expect((await c.talents.findById(SCOPE, 'old'))?.name).toBe(ANONYMIZED_NAME);
    expect((await c.talents.findById(SCOPE, 'mid'))?.name).not.toBe(ANONYMIZED_NAME);
    // a second sweep finds nothing new to do
    const second = await c.service.anonymizeOverdue(SCOPE);
    expect(second.anonymized).toBe(0);
  });

  it('RunAutoAnonymizeIfDue_OnlyWhenPolicyOptsIn', async () => {
    const c = ctx();
    await c.service.updatePolicy(SCOPE, { reviewDays: 30, deletionDays: 365 });
    await c.talents.add(talent('old', { updatedAt: '2025-05-21T10:00:00.000Z' }));
    // off by default: nothing happens
    await c.service.runAutoAnonymizeIfDue(SCOPE);
    expect((await c.talents.findById(SCOPE, 'old'))?.name).not.toBe(ANONYMIZED_NAME);
    // opt in: the sweep runs
    await c.service.updatePolicy(SCOPE, { autoAnonymize: true });
    await c.service.runAutoAnonymizeIfDue(SCOPE);
    expect((await c.talents.findById(SCOPE, 'old'))?.name).toBe(ANONYMIZED_NAME);
  });

  it('RunAutoAnonymizeIfDue_SwallowsFailures', async () => {
    const c = ctx();
    // a store that throws on get must not take the scheduler down
    c.policies.get = async () => {
      throw new Error('db down');
    };
    await expect(c.service.runAutoAnonymizeIfDue(SCOPE)).resolves.toBeUndefined();
  });
});
