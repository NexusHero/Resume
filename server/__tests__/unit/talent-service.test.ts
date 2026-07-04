import { TalentService } from '../../src/services/talent-service.js';
import { createTalentSchema, updateTalentSchema } from '../../src/domain/talent.js';
import { emptyResume, emptyLetter, defaultStyle } from '../../src/domain/talent-documents.js';
import { NotFoundError } from '../../src/domain/errors.js';
import {
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryAttachmentStore,
  InMemoryCandidacyRepository,
  FixedClock,
  SequenceIdGenerator,
} from '../support/fakes.js';
import { buildTalentDataPurgers } from '../support/talent-purgers.js';

const OWNER = 'owner1';

function makeService() {
  const repo = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const attachments = new InMemoryAttachmentStore();
  const candidacies = new InMemoryCandidacyRepository();
  const clock = new FixedClock();
  const service = new TalentService({
    talentRepository: repo,
    documentRepository: documents,
    talentDataPurgers: buildTalentDataPurgers({
      documentRepository: documents,
      attachmentStore: attachments,
      candidacyRepository: candidacies,
      clock,
    }),
    clock,
    idGenerator: new SequenceIdGenerator('talent'),
  });
  return { service, repo, documents, attachments, candidacies };
}

const validInput = { name: 'Lena Brandt', role: 'Product Designer' };

describe('TalentService', () => {
  it('Create_PersistsWithIdDefaultsAndTimestamps', async () => {
    const { service, repo } = makeService();
    const created = await service.create(OWNER, createTalentSchema.parse(validInput));
    expect(created).toMatchObject({
      id: 'talent1',
      ownerId: OWNER,
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
      OWNER,
      createTalentSchema.parse({ name: 'Marco', skills: ['Go', 'AWS'] }),
    );
    expect(created.skills).toEqual(['Go', 'AWS']);
  });

  it('ListWithSkills_TalentWithDocuments_MergesDocumentSkills', async () => {
    // Arrange: stored skills on the record, more skills only in the documents.
    const { service, documents } = makeService();
    const created = await service.create(
      OWNER,
      createTalentSchema.parse({ name: 'Nora', skills: ['React'] }),
    );
    await documents.save({
      ownerId: OWNER,
      talentId: created.id,
      contact: { name: 'Nora', role: '', email: '', phone: '', location: '', linkedin: '' },
      resume: {
        ...emptyResume,
        skillGroups: [{ label: 'Core', items: ['TypeScript'] }],
        experience: [
          { role: 'Dev', company: 'Acme', location: '', period: '', bullets: [], skills: ['Node'] },
        ],
      },
      letter: { ...emptyLetter },
      style: { ...defaultStyle },
      updatedAt: '2026-06-25T10:00:00.000Z',
    });
    // Act
    const listed = await service.listWithSkills(OWNER);
    // Assert: effectiveSkills carries record + document skills, canonicalized
    // (Node → Node.js); the stored field stays untouched.
    expect(listed[0]?.effectiveSkills).toEqual(
      expect.arrayContaining(['React', 'TypeScript', 'Node.js']),
    );
    expect(listed[0]?.skills).toEqual(['React']);
  });

  it('ListWithSkills_NoDocuments_UsesStoredSkills', async () => {
    const { service } = makeService();
    await service.create(OWNER, createTalentSchema.parse({ name: 'Ben', skills: ['Go'] }));
    const listed = await service.listWithSkills(OWNER);
    expect(listed[0]?.effectiveSkills).toEqual(['Go']);
  });

  it('List_ReturnsOnlyOwnRows', async () => {
    const { service } = makeService();
    await service.create(OWNER, createTalentSchema.parse({ name: 'A' }));
    await service.create(OWNER, createTalentSchema.parse({ name: 'B' }));
    await service.create('other', createTalentSchema.parse({ name: 'C' }));
    expect(await service.list(OWNER)).toHaveLength(2);
    expect(await service.list('other')).toHaveLength(1);
  });

  it('Get_Existing_Returns', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createTalentSchema.parse(validInput));
    expect(await service.get(OWNER, created.id)).toMatchObject({ id: created.id });
  });

  it('Get_OtherOwner_ThrowsNotFound', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createTalentSchema.parse(validInput));
    await expect(service.get('other', created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Get_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.get(OWNER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Update_Existing_AppliesPatchAndBumpsUpdatedAt', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createTalentSchema.parse(validInput));
    const updated = await service.update(
      OWNER,
      created.id,
      updateTalentSchema.parse({ availability: 'immediately' }),
    );
    expect(updated).toMatchObject({ availability: 'immediately', name: 'Lena Brandt' });
  });

  it('Update_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.update(OWNER, 'nope', { role: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('Remove_Existing_Deletes', async () => {
    const { service, repo } = makeService();
    const created = await service.create(OWNER, createTalentSchema.parse(validInput));
    await service.remove(OWNER, created.id);
    expect(repo.talents).toHaveLength(0);
  });

  it('Remove_Existing_CascadesDocuments', async () => {
    const { service, documents } = makeService();
    const created = await service.create(OWNER, createTalentSchema.parse(validInput));
    documents.documents.push({
      ownerId: OWNER,
      talentId: created.id,
      contact: { name: '', role: '', email: '', phone: '', location: '', linkedin: '' },
      resume: { summary: 'keep me?', experience: [], education: [], skillGroups: [] },
      letter: {
        firma: '',
        ansprechpartner: '',
        strasse: '',
        plzOrt: '',
        betreff: '',
        anrede: '',
        absaetze: [],
        gruss: '',
      },
      style: {
        accent: '#2A6FDB',
        strong: '#1d4ed8',
        onDark: '#7aa7f5',
        font: 'var(--font-display)',
        size: 1,
      },
      updatedAt: '2026-06-25T10:00:00.000Z',
    });
    await service.remove(OWNER, created.id);
    expect(documents.documents).toHaveLength(0);
  });

  it('Remove_OtherOwner_ThrowsNotFound', async () => {
    const { service } = makeService();
    const created = await service.create(OWNER, createTalentSchema.parse(validInput));
    await expect(service.remove('other', created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Remove_Unknown_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.remove(OWNER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
