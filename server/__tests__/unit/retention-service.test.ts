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
  const service = new RetentionService({
    talentRepository: talents,
    candidacyRepository: candidacies,
    documentRepository: documents,
    attachmentStore: attachments,
    clock: new FixedClock(NOW),
  });
  return { service, talents, candidacies, documents, attachments };
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
