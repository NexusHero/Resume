import AdmZip from 'adm-zip';
import { DocumentService } from '../../src/services/document-service.js';
import { NotFoundError } from '../../src/domain/errors.js';
import {
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryUserRepository,
  InMemoryAttachmentStore,
  FakePdfRenderer,
  FakePdfMerger,
  FixedClock,
} from '../support/fakes.js';
import type { Talent } from '../../src/domain/talent.js';
import type { SaveDocumentsInput } from '../../src/domain/talent-documents.js';

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
  const users = new InMemoryUserRepository();
  const service = new DocumentService({
    documentRepository: documents,
    talentRepository: talents,
    userRepository: users,
    attachmentStore: attachments,
    pdfRenderer: pdf,
    pdfMerger: new FakePdfMerger(),
    clock: new FixedClock(),
  });
  return { service, talents, documents, attachments, pdf, users };
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

  it('Get_SelfWithoutTalentRecord_SeedsContactFromUser', async () => {
    // Arrange: the recruiter's own documents are keyed by their user id — no
    // talent record exists for "me".
    const c = ctx();
    await c.users.add({
      id: 'user1',
      email: 'nora.weber@example.de',
      passwordHash: 'x',
      roles: ['recruiter'],
      createdAt: '2026-06-25T10:00:00.000Z',
    });
    // Act
    const docs = await c.service.get(OWNER, 'user1');
    // Assert: contact seeded from the account (name derived from the email).
    expect(docs.contact).toMatchObject({
      name: 'Nora Weber',
      role: 'Recruiter',
      email: 'nora.weber@example.de',
    });
  });

  it('Get_SelfWithPlusAddressedEmail_DerivesACleanName', async () => {
    // A plus-address / digits in the local part must not leak into the greeting:
    // "recruiter+test123@…" → "Recruiter", not "Recruiter+" or "Recruiter123".
    const c = ctx();
    await c.users.add({
      id: 'user1',
      email: 'recruiter+test123@nexushero.test',
      passwordHash: 'x',
      roles: ['recruiter'],
      createdAt: '2026-06-25T10:00:00.000Z',
    });
    const docs = await c.service.get(OWNER, 'user1');
    expect(docs.contact.name).toBe('Recruiter');
  });

  it('Save_SelfWithoutTalentRecord_Persists', async () => {
    const c = ctx();
    await c.users.add({
      id: 'user1',
      email: 'me@example.de',
      passwordHash: 'x',
      roles: ['recruiter'],
      createdAt: '2026-06-25T10:00:00.000Z',
    });
    const saved = await c.service.save(OWNER, 'user1', input);
    expect(saved.talentId).toBe('user1');
    expect((await c.service.get(OWNER, 'user1')).resume.summary).toBe(input.resume.summary);
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
    // German letter → German-locale date line, prefixed with the sender's city
    expect(c.pdf.lastHtml).toContain('Leipzig, 25.6.2026');
  });

  it('RenderPdf_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.renderPdf(OWNER, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('RenderPreviewHtml_IsByteIdenticalToTheHtmlThePdfIsBuiltFrom', async () => {
    // The WYSIWYG guarantee (ADR-0052): the editor's live preview and the PDF
    // export must never drift. Both run the same content through the same
    // documentsToHtml, so the preview HTML equals the exact HTML Puppeteer turns
    // into the PDF (FakePdfRenderer.renderHtml records it verbatim).
    const c = ctx();
    await c.talents.add(talent('t1'));
    const saved = await c.service.save(OWNER, 't1', input);

    await c.service.renderPdf(OWNER, 't1');
    const pdfSourceHtml = c.pdf.lastHtml;

    const previewHtml = c.service.renderPreviewHtml({
      contact: saved.contact,
      resume: saved.resume,
      letter: saved.letter,
      style: saved.style,
    });

    expect(previewHtml).toBe(pdfSourceHtml);
    expect(previewHtml).toContain('Designer with 8 years of experience.');
  });

  it('RenderPreviewHtml_ByteIdenticalForTheInkTemplateToo', async () => {
    // The parity invariant must hold for every template — the ink two-column
    // layout is one string from documentsToHtml, so preview === PDF source.
    const c = ctx();
    await c.talents.add(talent('t1'));
    const inkInput = { ...input, style: { ...input.style, template: 'ink' as const } };
    const saved = await c.service.save(OWNER, 't1', inkInput);

    await c.service.renderPdf(OWNER, 't1');
    const pdfSourceHtml = c.pdf.lastHtml;

    const previewHtml = c.service.renderPreviewHtml({
      contact: saved.contact,
      resume: saved.resume,
      letter: saved.letter,
      style: saved.style,
    });

    expect(previewHtml).toBe(pdfSourceHtml);
    expect(previewHtml).toContain('class="tpl-ink"');
  });

  it('RenderPreviewHtml_NeverPersists', async () => {
    // The preview renders the posted (possibly unsaved) body and touches no store.
    const c = ctx();
    c.service.renderPreviewHtml(input);
    expect(c.documents.documents).toHaveLength(0);
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

  it('RenderDossierZip_ContainsPdfAndHtmlWithRecipientAndEmbeddedDocumentsJson', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input);
    const documents = await c.service.get(OWNER, 't1');

    const zipBuffer = await c.service.renderDossierZip(OWNER, documents, {
      company: 'Helio GmbH',
      subject: 'Bewerbung als Lead',
    });

    const zip = new AdmZip(zipBuffer);
    const entryNames = zip.getEntries().map((e) => e.entryName);
    expect(entryNames.sort()).toEqual(['Bewerbung.html', 'Bewerbung.pdf']);

    const pdfEntry = zip.getEntry('Bewerbung.pdf')?.getData();
    expect(pdfEntry?.length).toBeGreaterThan(0);

    const htmlEntry = zip.getEntry('Bewerbung.html')?.getData().toString('utf8') ?? '';
    expect(htmlEntry).toContain('Helio GmbH'); // recipient override, in the letter
    expect(htmlEntry).toContain('<script id="myjob-resume-data" type="application/json">'); // embedded structured documents for re-import
    expect(htmlEntry).toContain('"firma":"Aurora Systems GmbH"'); // embedded JSON keeps the saved (unmerged) letter
  });

  it('RenderDossierZip_AppendsSelectedPdfAttachments', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.service.save(OWNER, 't1', input);
    const documents = await c.service.get(OWNER, 't1');
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

    const zipBuffer = await c.service.renderDossierZip(OWNER, documents, {}, ['a1']);

    const zip = new AdmZip(zipBuffer);
    const pdfEntry = zip.getEntry('Bewerbung.pdf')?.getData().toString() ?? '';
    expect(pdfEntry).toContain('ATTACHMENT-BYTES'); // attachment merged into the PDF part
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
