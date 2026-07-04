import { AttachmentService } from '../../src/services/attachment-service.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import {
  InMemoryTalentRepository,
  InMemoryUserRepository,
  InMemoryAttachmentStore,
  FixedClock,
  SequenceIdGenerator,
} from '../support/fakes.js';
import type { Talent } from '../../src/domain/talent.js';

const OWNER = 'owner1';
const talent = (id: string, ownerId = OWNER): Talent => ({
  id,
  ownerId,
  name: 'Lena',
  role: '',
  headline: '',
  location: '',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

const pdfB64 = Buffer.from('%PDF-1.4 hello').toString('base64');

function ctx() {
  const talents = new InMemoryTalentRepository();
  const store = new InMemoryAttachmentStore();
  const service = new AttachmentService({
    attachmentStore: store,
    talentRepository: talents,
    userRepository: new InMemoryUserRepository(),
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('att'),
  });
  return { service, talents, store };
}

describe('AttachmentService', () => {
  it('Upload_DecodesBytesAndStoresMetadata', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const att = await c.service.upload(OWNER, 't1', {
      name: 'Zeugnis.pdf',
      contentType: 'application/pdf',
      dataBase64: pdfB64,
    });
    expect(att).toMatchObject({ name: 'Zeugnis.pdf', talentId: 't1', ownerId: OWNER });
    expect(att.size).toBe(Buffer.from(pdfB64, 'base64').length);
    expect(await c.service.list(OWNER, 't1')).toHaveLength(1);
  });

  it('Download_ReturnsStoredBytes', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const att = await c.service.upload(OWNER, 't1', {
      name: 'x.pdf',
      contentType: 'application/pdf',
      dataBase64: pdfB64,
    });
    const blob = await c.service.download(OWNER, att.id);
    expect(blob.bytes.toString()).toBe('%PDF-1.4 hello');
  });

  it('Upload_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(
      c.service.upload(OWNER, 'missing', {
        name: 'x',
        contentType: 'application/pdf',
        dataBase64: pdfB64,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Upload_EmptyBytes_Throws400', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(
      c.service.upload(OWNER, 't1', {
        name: 'x',
        contentType: 'application/pdf',
        dataBase64: '####',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('List_ForeignOwner_Throws404', async () => {
    const c = ctx();
    await c.talents.add(talent('t1', OWNER));
    await c.service.upload(OWNER, 't1', {
      name: 'a',
      contentType: 'application/pdf',
      dataBase64: pdfB64,
    });
    // a different owner has no such talent → not found (no data leak)
    await expect(c.service.list('intruder', 't1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Remove_Existing_DeletesElseThrows404', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const att = await c.service.upload(OWNER, 't1', {
      name: 'x',
      contentType: 'application/pdf',
      dataBase64: pdfB64,
    });
    await c.service.remove(OWNER, att.id);
    expect(await c.service.list(OWNER, 't1')).toEqual([]);
    await expect(c.service.remove(OWNER, att.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Download_Unknown_Throws404', async () => {
    const c = ctx();
    await expect(c.service.download(OWNER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
