import { JobApplicationService } from '../../src/services/job-application-service.js';
import { FrozenError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { JobApplication } from '../../src/domain/job-application.js';
import type { JobPosting } from '../../src/domain/job-posting.js';
import type { Talent } from '../../src/domain/talent.js';
import {
  defaultStyle,
  emptyContact,
  emptyDocuments,
  type TalentDocuments,
} from '../../src/domain/talent-documents.js';
import {
  FixedClock,
  InMemoryAttachmentStore,
  InMemoryDocumentRepository,
  InMemoryJobApplicationRepository,
  InMemoryJobPostingRepository,
  InMemoryTalentRepository,
  SequenceIdGenerator,
} from '../support/fakes.js';

const posting = (id: string, ownerId = 'team', over: Partial<JobPosting> = {}): JobPosting => ({
  id,
  ownerId,
  source: 'text',
  company: 'Acme',
  title: 'Engineer',
  location: 'Berlin',
  country: 'DE',
  description: 'Full ad.',
  requirements: ['Rust'],
  descriptionIncomplete: false,
  createdAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const talent = (id: string, ownerId = 'team', over: Partial<Talent> = {}): Talent => ({
  id,
  ownerId,
  name: 'Ada Lovelace',
  role: 'Engineer',
  headline: '',
  location: 'Berlin',
  email: 'ada@x.test',
  phone: '',
  availability: '',
  salary: '',
  skills: ['Rust'],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const baseDocuments = (ownerId: string, talentId: string): TalentDocuments => ({
  ownerId,
  talentId,
  contact: { ...emptyContact, name: 'Ada Lovelace' },
  resume: {
    summary: 'Base summary.',
    experience: [
      { role: 'SWE', company: 'Acme', period: '', location: '', bullets: ['b'], skills: ['Rust'] },
    ],
    education: [],
    skillGroups: [],
    rawText: 'BASE-RAW-TEXT',
  },
  letter: {
    firma: '',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: '',
    absaetze: ['base'],
    gruss: '',
  },
  style: defaultStyle,
  updatedAt: '2026-06-25T10:00:00.000Z',
});

function makeService() {
  const postings = new InMemoryJobPostingRepository();
  const talents = new InMemoryTalentRepository();
  const applications = new InMemoryJobApplicationRepository();
  const documents = new InMemoryDocumentRepository();
  const attachments = new InMemoryAttachmentStore();
  const clock = new FixedClock();
  const service = new JobApplicationService({
    jobApplicationRepository: applications,
    jobPostingRepository: postings,
    talentRepository: talents,
    documentRepository: documents,
    attachmentStore: attachments,
    clock,
    idGenerator: new SequenceIdGenerator('app'),
  });
  return { postings, talents, applications, documents, attachments, clock, service };
}

describe('JobApplicationService.create', () => {
  it('JobApplicationService_Create_CopiesBaseDocumentsAndSeedsStatusDraft', async () => {
    const { postings, talents, documents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    await documents.save(baseDocuments('team', 't1'));

    const result = await service.create('team', { jobPostingId: 'p1', talentId: 't1' });
    expect(result.alreadyExisting).toBe(false);
    const app = result.jobApplication;
    expect(app.status).toBe('draft');
    expect(app.statusHistory).toEqual([{ status: 'draft', at: app.createdAt }]);
    // The copy blanks rawText and drops translations (AK-2.3).
    expect(app.documents.resume.rawText).toBe('');
    expect(app.documents.translations).toBeUndefined();
    // The base CV is untouched (byte-identical semantics: rawText still there).
    expect((await documents.get('team', 't1'))?.resume.rawText).toBe('BASE-RAW-TEXT');
  });

  it('JobApplicationService_Create_SnapshotsPostingCompanyAndTitle', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1', 'team', { company: 'Snap Corp', title: 'Staff Engineer' }));
    await talents.add(talent('t1'));
    const result = await service.create('team', { jobPostingId: 'p1', talentId: 't1' });
    expect(result.jobApplication.postingCompany).toBe('Snap Corp');
    expect(result.jobApplication.postingTitle).toBe('Staff Engineer');
  });

  it('JobApplicationService_Create_SeedsTalentNameStatusDraftAndUpdatedAt', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1', 'team', { name: 'Grace Hopper' }));
    const result = await service.create('team', { jobPostingId: 'p1', talentId: 't1' });
    const app = result.jobApplication;
    expect(app.talentName).toBe('Grace Hopper');
    expect(app.status).toBe('draft');
    expect(app.updatedAt).toBe(app.createdAt);
  });

  it('JobApplicationService_Create_UnknownPosting_ThrowsNotFound', async () => {
    const { talents, service } = makeService();
    await talents.add(talent('t1'));
    await expect(service.create('team', { jobPostingId: 'nope', talentId: 't1' })).rejects.toThrow(
      'Job posting not found',
    );
  });

  it('JobApplicationService_Create_UnknownTalent_ThrowsNotFound', async () => {
    const { postings, service } = makeService();
    await postings.add(posting('p1'));
    await expect(service.create('team', { jobPostingId: 'p1', talentId: 'nope' })).rejects.toThrow(
      'Candidate not found',
    );
  });

  it('JobApplicationService_Create_SamePostingAndTalent_ReturnsExistingWithAlreadyExisting', async () => {
    const { postings, talents, applications, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const first = await service.create('team', { jobPostingId: 'p1', talentId: 't1' });
    const second = await service.create('team', { jobPostingId: 'p1', talentId: 't1' });
    expect(second.alreadyExisting).toBe(true);
    expect(second.jobApplication.id).toBe(first.jobApplication.id);
    expect((await applications.list('team')).length).toBe(1);
  });

  it('JobApplicationService_Create_DifferentPostingsSameTalent_IndependentDocumentCopies', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await postings.add(posting('p2', 'team', { company: 'Other', title: 'Other role' }));
    await talents.add(talent('t1'));

    const a1 = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    const a2 = (await service.create('team', { jobPostingId: 'p2', talentId: 't1' }))
      .jobApplication;
    expect(a1.documents).not.toBe(a2.documents);

    // Edit one copy: the other copy is unaffected.
    await service.saveDocuments('team', a1.id, {
      contact: { ...a1.documents.contact, name: 'Changed' },
      resume: { ...a1.documents.resume, summary: 'Changed summary' },
      letter: a1.documents.letter,
      style: a1.documents.style,
    });
    const a2after = await service.get('team', a2.id);
    expect(a2after.documents.resume.summary).not.toBe('Changed summary');
  });

  it('JobApplicationService_Create_NoBaseDocuments_SeedsEmptyCopy', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1', 'team', { name: 'Ada Lovelace', email: 'ada@x.test' }));
    const result = await service.create('team', { jobPostingId: 'p1', talentId: 't1' });
    const docs = result.jobApplication.documents;
    expect(docs.resume.summary).toBe('');
    expect(docs.resume.experience).toEqual([]);
    expect(docs.contact.name).toBe('Ada Lovelace');
    expect(docs.contact.email).toBe('ada@x.test');
  });

  it('JobApplicationService_Create_RaceBackstop_ReturnsExistingWinner', async () => {
    const { postings, talents, applications, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    // Simulate the sql unique-index race (ADR-0059): a concurrent add of the same
    // (posting, talent) won, so `add` stores a different row than the one built.
    const winner: JobApplication = {
      id: 'winner',
      ownerId: 'team',
      jobPostingId: 'p1',
      postingCompany: 'Acme',
      postingTitle: 'Engineer',
      talentId: 't1',
      talentName: 'Ada Lovelace',
      status: 'draft',
      statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
      documents: emptyDocuments('team', 't1', { ...emptyContact }, '2026-06-25T10:00:00.000Z'),
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    };
    applications.add = async () => {
      applications.applications.push(winner);
    };
    const result = await service.create('team', { jobPostingId: 'p1', talentId: 't1' });
    expect(result.alreadyExisting).toBe(true);
    expect(result.jobApplication.id).toBe('winner');
  });
});

describe('JobApplicationService.saveDocuments', () => {
  it('JobApplicationService_SaveDocuments_StripsRawTextAndTranslations', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;

    const saved = await service.saveDocuments('team', app.id, {
      contact: app.documents.contact,
      resume: { ...app.documents.resume, rawText: 'INJECTED-RAW' },
      letter: app.documents.letter,
      style: app.documents.style,
    });
    expect(saved.resume.rawText).toBe('');
    expect(saved.translations).toBeUndefined();
    const persisted = await service.getDocuments('team', app.id);
    expect(persisted.resume.rawText).toBe('');
  });
});

describe('JobApplicationService.changeStatus', () => {
  it('JobApplicationService_ChangeStatus_AppendsTimestampedHistoryEntry', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;

    const changed = await service.changeStatus('team', app.id, 'sent');
    expect(changed.status).toBe('sent');
    expect(changed.statusHistory).toHaveLength(2);
    expect(changed.statusHistory[changed.statusHistory.length - 1].status).toBe('sent');
    expect(changed.statusHistory[0].status).toBe('draft');
  });

  it('JobApplicationService_ChangeStatus_AnyTransitionAllowedIncludingBackwards', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;

    await service.changeStatus('team', app.id, 'offer');
    const back = await service.changeStatus('team', app.id, 'draft');
    expect(back.status).toBe('draft');
    expect(back.statusHistory.map((e) => e.status)).toEqual(['draft', 'offer', 'draft']);
  });
});

describe('JobApplicationService.delete', () => {
  it('JobApplicationService_Delete_RemovesOwnedApplication', async () => {
    const { postings, talents, applications, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;

    await service.delete('team', app.id);
    expect(await applications.findById('team', app.id)).toBeNull();
    // A foreign id (not in this scope) is a 404, not a silent no-op.
    await expect(service.delete('team', 'foreign')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('JobApplicationService.list', () => {
  it('JobApplicationService_List_FiltersByTalentId', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await postings.add(posting('p2', 'team', { company: 'Other', title: 'Other' }));
    await talents.add(talent('t1'));
    await talents.add(talent('t2'));
    await service.create('team', { jobPostingId: 'p1', talentId: 't1' });
    await service.create('team', { jobPostingId: 'p2', talentId: 't2' });

    const all = await service.list('team');
    expect(all).toHaveLength(2);
    const forT1 = await service.list('team', 't1');
    expect(forT1.map((a) => a.talentId)).toEqual(['t1']);
  });

  it('JobApplicationService_List_FiltersByStatus', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await postings.add(posting('p2', 'team', { company: 'Other', title: 'Other' }));
    await talents.add(talent('t1'));
    await talents.add(talent('t2'));
    const a1 = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await service.create('team', { jobPostingId: 'p2', talentId: 't2' });
    await service.changeStatus('team', a1.id, 'sent');

    expect((await service.list('team', undefined, 'sent')).map((a) => a.id)).toEqual([a1.id]);
    expect(await service.list('team', undefined, 'offer')).toEqual([]);
  });
});

describe('JobApplicationService freeze (AK-4.5)', () => {
  const docsInput = (app: JobApplication) => ({
    contact: app.documents.contact,
    resume: app.documents.resume,
    letter: app.documents.letter,
    style: app.documents.style,
  });

  it('JobApplicationService_SaveDocuments_Draft_NotFrozen', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await expect(service.saveDocuments('team', app.id, docsInput(app))).resolves.toBeTruthy();
  });

  it('JobApplicationService_SaveDocuments_Frozen_ThrowsFrozenWithoutUnfreeze', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await service.changeStatus('team', app.id, 'sent');
    await expect(service.saveDocuments('team', app.id, docsInput(app))).rejects.toBeInstanceOf(
      FrozenError,
    );
  });

  it('JobApplicationService_SaveDocuments_FrozenWithUnfreeze_AppendsNotedHistoryEntry', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await service.changeStatus('team', app.id, 'sent');

    await service.saveDocuments('team', app.id, docsInput(app), true);
    const after = await service.get('team', app.id);
    expect(after.statusHistory).toHaveLength(3);
    const last = after.statusHistory[after.statusHistory.length - 1];
    expect(last.note).toBe('Documents edited after freezing');
    expect(last.status).toBe('sent');
  });

  it('JobApplicationService_SaveDocuments_Frozen_MultipleUnfreezeSaves_SingleNote', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await service.changeStatus('team', app.id, 'sent');

    // Several forced saves of the same kind in the same status phase → exactly
    // one note (no autosave spam).
    await service.saveDocuments('team', app.id, docsInput(app), true);
    await service.saveDocuments('team', app.id, docsInput(app), true);
    await service.saveDocuments('team', app.id, docsInput(app), true);
    const after = await service.get('team', app.id);
    expect(after.statusHistory.filter((e) => e.note)).toHaveLength(1);
  });

  it('JobApplicationService_SaveDocuments_Frozen_UnfreezeDocumentsThenAttachments_TwoDistinctNotes', async () => {
    const { postings, talents, attachments, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await attachments.add(
      {
        id: 'att1',
        ownerId: 'team',
        talentId: 't1',
        name: 'Zeugnis.pdf',
        contentType: 'application/pdf',
        size: 5,
        createdAt: '2026-06-25T10:00:00.000Z',
      },
      Buffer.from('%PDF-'),
    );
    await service.changeStatus('team', app.id, 'sent');

    // Two *different* forced edits after "sent" → two distinguishable notes.
    await service.saveDocuments('team', app.id, docsInput(app), true);
    await service.saveAttachments('team', app.id, ['att1'], true);
    const after = await service.get('team', app.id);
    const notes = after.statusHistory.filter((e) => e.note).map((e) => e.note);
    expect(notes).toEqual(['Documents edited after freezing', 'Attachments edited after freezing']);
  });

  it('JobApplicationService_SaveAttachments_UpdatesSelectionAndBumpsUpdatedAt', async () => {
    const { postings, talents, attachments, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await attachments.add(
      {
        id: 'att1',
        ownerId: 'team',
        talentId: 't1',
        name: 'Zeugnis.pdf',
        contentType: 'application/pdf',
        size: 5,
        createdAt: '2026-06-25T10:00:00.000Z',
      },
      Buffer.from('%PDF-'),
    );

    const updated = await service.saveAttachments('team', app.id, ['att1']);
    expect(updated.selectedAttachmentIds).toEqual(['att1']);
    expect(updated.updatedAt).toBe('2026-06-25T10:00:00.000Z');
    expect((await service.get('team', app.id)).selectedAttachmentIds).toEqual(['att1']);
  });

  it('JobApplicationService_SaveAttachments_ForeignTalentAttachment_ThrowsNotFound', async () => {
    const { postings, talents, attachments, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    await talents.add(talent('t2'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    // An attachment that belongs to another talent (foreign) must not be selectable.
    await attachments.add(
      {
        id: 'foreign',
        ownerId: 'team',
        talentId: 't2',
        name: 'x.pdf',
        contentType: 'application/pdf',
        size: 5,
        createdAt: '2026-06-25T10:00:00.000Z',
      },
      Buffer.from('%PDF-'),
    );
    await expect(service.saveAttachments('team', app.id, ['foreign'])).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('JobApplicationService_SaveAttachments_NonPdfAttachment_ThrowsValidation', async () => {
    const { postings, talents, attachments, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await attachments.add(
      {
        id: 'img',
        ownerId: 'team',
        talentId: 't1',
        name: 'portrait.png',
        contentType: 'image/png',
        size: 5,
        createdAt: '2026-06-25T10:00:00.000Z',
      },
      Buffer.from('PNG'),
    );
    await expect(service.saveAttachments('team', app.id, ['img'])).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('JobApplicationService_SaveAttachments_Frozen_ThrowsFrozenWithoutUnfreeze', async () => {
    const { postings, talents, service } = makeService();
    await postings.add(posting('p1'));
    await talents.add(talent('t1'));
    const app = (await service.create('team', { jobPostingId: 'p1', talentId: 't1' }))
      .jobApplication;
    await service.changeStatus('team', app.id, 'sent');
    await expect(service.saveAttachments('team', app.id, [])).rejects.toBeInstanceOf(FrozenError);
  });
});
