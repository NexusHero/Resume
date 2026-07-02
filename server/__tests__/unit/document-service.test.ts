import { DocumentService } from '../../src/services/document-service';
import { NotFoundError } from '../../src/domain/errors';
import {
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryAttachmentStore,
  FakePdfRenderer,
  FakePdfMerger,
  FixedClock,
} from '../support/fakes';
import type { Talent } from '../../src/domain/talent';
import type { SaveDocumentsInput } from '../../src/domain/talent-documents';

const OWNER = 'owner1';

const talent = (id: string, ownerId = OWNER): Talent => ({
  id,
  ownerId,
  name: 'Lena Brandt',
  role: 'Product Designer',
  headline: '',
  location: 'Leipzig',
  email: 'lena@example.com',
  phone: '+49 151 000',
  availability: 'immediately',
  salary: '64.000 €',
  skills: ['Figma'],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

const input: SaveDocumentsInput = {
  contact: {
    name: 'Lena Brandt',
    role: 'Senior Designer',
    email: 'lena@example.com',
    phone: '',
    location: 'Leipzig',
    linkedin: 'linkedin.com/in/lena',
  },
  resume: {
    summary: 'Designer with 8 years of experience.',
    experience: [
      {
        role: 'Designer',
        company: 'Aurora',
        period: '2020—',
        location: 'Leipzig',
        bullets: ['Led design system'],
        skills: ['Figma'],
      },
    ],
    education: [{ degree: 'B.A.', school: 'HfG', period: '2012—2016', note: '' }],
    skillGroups: [{ label: 'Tools', items: ['Figma', 'Sketch'] }],
  },
  letter: {
    firma: 'Aurora Systems GmbH',
    ansprechpartner: 'Frau Vogel',
    strasse: 'Hauptstr. 1',
    plzOrt: '04109 Leipzig',
    betreff: 'Bewerbung als Designerin',
    anrede: 'Sehr geehrte Frau Vogel,',
    absaetze: ['Absatz eins.', 'Absatz zwei.'],
    gruss: 'Mit freundlichen Grüßen',
  },
  style: {
    accent: '#1F8A5B',
    strong: '#15734a',
    onDark: '#6ee7b7',
    font: 'var(--font-body)',
    size: 1.1,
  },
};

function ctx() {
  const talents = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const attachments = new InMemoryAttachmentStore();
  const pdf = new FakePdfRenderer();
  const service = new DocumentService({
    documentRepository: documents,
    talentRepository: talents,
    attachmentStore: attachments,
    pdfRenderer: pdf,
    pdfMerger: new FakePdfMerger(),
    clock: new FixedClock(),
  });
  return { service, talents, documents, attachments, pdf };
}

describe('DocumentService', () => {
  it('Get_NoDocumentsYet_SeedsContactFromTalent', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));

    const docs = await c.service.get(OWNER, 't1');

    expect(docs.contact).toMatchObject({
      name: 'Lena Brandt',
      email: 'lena@example.com',
      linkedin: '',
    });
    expect(docs.resume.experience).toEqual([]);
    expect(docs.letter.anrede).toBe('Sehr geehrte Damen und Herren,');
    expect(docs.style.accent).toBe('#2A6FDB');
  });

  it('Save_ThenGet_RoundTripsAndStampsUpdatedAt', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));

    const saved = await c.service.save(OWNER, 't1', input);
    expect(saved.updatedAt).toBe(new FixedClock().isoNow());

    const loaded = await c.service.get(OWNER, 't1');
    expect(loaded.resume.summary).toBe('Designer with 8 years of experience.');
    expect(loaded.letter.absaetze).toEqual(['Absatz eins.', 'Absatz zwei.']);
    expect(loaded.style.accent).toBe('#1F8A5B');
  });

  it('Save_OverwritesExisting', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input);
    await c.service.save(OWNER, 't1', {
      ...input,
      resume: { ...input.resume, summary: 'Updated.' },
    });
    expect((await c.service.get(OWNER, 't1')).resume.summary).toBe('Updated.');
    expect(c.documents.documents).toHaveLength(1);
  });

  it('Save_PreservesStoredTranslations', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input);
    await c.service.saveTranslation(OWNER, 't1', 'en', {
      resume: { summary: 'Translated.', experience: [], education: [], skillGroups: [] },
      letter: {
        firma: '',
        ansprechpartner: '',
        strasse: '',
        plzOrt: '',
        betreff: '',
        anrede: '',
        absaetze: ['Hello'],
        gruss: '',
      },
      provider: 'claude',
      updatedAt: new FixedClock().isoNow(),
    });
    // A normal editor save must not drop the stored language variant.
    await c.service.save(OWNER, 't1', { ...input, resume: { ...input.resume, summary: 'Edit.' } });
    const loaded = await c.service.get(OWNER, 't1');
    expect(loaded.resume.summary).toBe('Edit.');
    expect(loaded.translations?.en?.resume.summary).toBe('Translated.');
  });

  it('RenderPdf_BuildsHtmlFromSavedDocuments', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input);
    const pdf = await c.service.renderPdf(OWNER, 't1');
    expect(pdf.length).toBeGreaterThan(0);
    // the rendered HTML carries the saved content
    expect(c.pdf.lastHtml).toContain('Designer with 8 years of experience.');
    expect(c.pdf.lastHtml).toContain('Absatz eins.');
  });

  it('RenderPdf_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.renderPdf(OWNER, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('RenderDossierPdf_AddressesLetterToRecipient', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input); // saved letter.firma = Aurora Systems GmbH
    const pdf = await c.service.renderDossierPdf(OWNER, 't1', {
      company: 'Helio GmbH',
      subject: 'Bewerbung als Lead',
    });
    expect(pdf.length).toBeGreaterThan(0);
    expect(c.pdf.lastHtml).toContain('Helio GmbH'); // recipient override
    expect(c.pdf.lastHtml).toContain('Bewerbung als Lead');
    expect(c.pdf.lastHtml).not.toContain('Aurora Systems GmbH'); // replaced
  });

  it('RenderDossierPdf_EmptyRecipient_KeepsSavedLetter', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input);
    await c.service.renderDossierPdf(OWNER, 't1', {});
    expect(c.pdf.lastHtml).toContain('Aurora Systems GmbH'); // saved value kept
  });

  it('RenderDossierPdf_AppendsSelectedPdfAttachments', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input);
    await c.attachments.add(
      {
        id: 'a1',
        ownerId: OWNER,
        talentId: 't1',
        name: 'Zeugnis.pdf',
        contentType: 'application/pdf',
        size: 5,
        createdAt: 'now',
      },
      Buffer.from('ATTACHMENT-BYTES'),
    );
    // FakePdfRenderer.renderHtml → 'pdf:<len>'; FakePdfMerger concatenates parts.
    const pdf = await c.service.renderDossierPdf(OWNER, 't1', {}, ['a1']);
    expect(pdf.toString()).toContain('ATTACHMENT-BYTES'); // attachment merged in
  });

  it('RenderDossierPdf_SkipsNonPdfAttachments', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input);
    await c.attachments.add(
      {
        id: 'a1',
        ownerId: OWNER,
        talentId: 't1',
        name: 'photo.png',
        contentType: 'image/png',
        size: 5,
        createdAt: 'now',
      },
      Buffer.from('PNG-BYTES'),
    );
    const pdf = await c.service.renderDossierPdf(OWNER, 't1', {}, ['a1']);
    expect(pdf.toString()).not.toContain('PNG-BYTES'); // non-PDF not merged
  });

  it('Get_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.get(OWNER, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Save_ForeignOwnersTalent_Throws404', async () => {
    const c = ctx();
    await c.talents.add(talent('t1', 'other'));
    await expect(c.service.save(OWNER, 't1', input)).rejects.toBeInstanceOf(NotFoundError);
  });
});
