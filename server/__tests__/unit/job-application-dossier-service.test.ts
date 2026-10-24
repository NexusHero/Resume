import AdmZip from 'adm-zip';
import { jest } from '@jest/globals';
import { JobApplicationDossierService } from '../../src/services/job-application-dossier-service.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { JobApplication } from '../../src/domain/job-application.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';
import type { DossierRecipient } from '../../src/services/document-service.js';
import { InMemoryAttachmentStore, InMemoryJobApplicationRepository } from '../support/fakes.js';

/** A stub DocumentService recording every render call and returning a fixed PDF. */
class FakeDocumentService {
  calls: Array<{
    scope: string;
    documents: TalentDocuments;
    recipient: DossierRecipient;
    attachmentIds: string[];
    order: string;
  }> = [];
  result: Buffer = Buffer.from('%PDF-merged');

  async renderDossierFromDocuments(
    scope: string,
    documents: TalentDocuments,
    recipient: DossierRecipient,
    attachmentIds: string[] = [],
    order: string = 'resume-first',
  ): Promise<Buffer> {
    this.calls.push({ scope, documents, recipient, attachmentIds, order });
    return this.result;
  }
}

const documents = (firma = ''): TalentDocuments => ({
  ownerId: 'team',
  talentId: 't1',
  contact: { name: 'Ada', role: '', email: '', phone: '', location: '', linkedin: '' },
  resume: { summary: 'Base', experience: [], education: [], skillGroups: [], rawText: '' },
  letter: {
    firma,
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: '',
    absaetze: [],
    gruss: '',
  },
  style: { template: 'classic', accent: '', strong: '', onDark: '', font: '', size: 1 },
  updatedAt: '2026-06-25T10:00:00.000Z',
});

const application = (over: Partial<JobApplication> = {}): JobApplication => ({
  id: 'a1',
  ownerId: 'team',
  jobPostingId: 'p1',
  postingCompany: 'Acme GmbH',
  postingTitle: 'Engineer',
  talentId: 't1',
  talentName: 'Ada Lovelace',
  status: 'draft',
  statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
  documents: documents(),
  selectedAttachmentIds: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const pdfAttachment = (id: string, name = `${id}.pdf`, talentId = 't1') => ({
  attachment: {
    id,
    ownerId: 'team',
    talentId,
    name,
    contentType: 'application/pdf',
    size: 5,
    createdAt: '2026-06-25T10:00:00.000Z',
  },
  bytes: Buffer.from(`%PDF-${id}`),
});

function makeService() {
  const repo = new InMemoryJobApplicationRepository();
  const attachments = new InMemoryAttachmentStore();
  const docs = new FakeDocumentService();
  const service = new JobApplicationDossierService({
    jobApplicationRepository: repo,
    attachmentStore: attachments,
    documentService: docs as never,
  });
  return { repo, attachments, docs, service };
}

describe('JobApplicationDossierService.renderPdf', () => {
  it('JobApplicationDossierService_RenderPdf_UsesCopyNotBase', async () => {
    const { repo, attachments, docs, service } = makeService();
    await attachments.add(pdfAttachment('att1').attachment, pdfAttachment('att1').bytes);
    const app = application({ selectedAttachmentIds: ['att1'] });
    await repo.add(app);

    await service.renderPdf('team', 'a1');
    const call = docs.calls[0];
    // The copy (not the base CV) is rendered, with the selection and letter-first order.
    expect(call.documents).toBe(app.documents);
    expect(call.attachmentIds).toEqual(['att1']);
    expect(call.order).toBe('letter-first');
  });

  it('JobApplicationDossierService_RenderPdf_EmptyFirma_PassesPostingCompanyAsRecipient', async () => {
    const { repo, docs, service } = makeService();
    await repo.add(application({ documents: documents('') }));
    await service.renderPdf('team', 'a1');
    expect(docs.calls[0].recipient).toEqual({ company: 'Acme GmbH' });
  });

  it('JobApplicationDossierService_RenderPdf_NonEmptyFirma_PassesEmptyRecipient', async () => {
    const { repo, docs, service } = makeService();
    await repo.add(application({ documents: documents('Muster GmbH') }));
    await service.renderPdf('team', 'a1');
    expect(docs.calls[0].recipient).toEqual({});
  });

  it('JobApplicationDossierService_RenderPdf_UnknownApplication_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(service.renderPdf('team', 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('JobApplicationDossierService_RenderPdf_MissingCopy_ThrowsNotFound', async () => {
    const { repo, service } = makeService();
    await repo.add(application({ documents: undefined as never }));
    await expect(service.renderPdf('team', 'a1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('JobApplicationDossierService_RenderPdf_ForeignAttachment_ThrowsNotFound', async () => {
    const { repo, attachments, service } = makeService();
    // An attachment of a different talent must not be rendered into the Mappe.
    await attachments.add(
      pdfAttachment('foreign', 'foreign.pdf', 't2').attachment,
      pdfAttachment('foreign', 'foreign.pdf', 't2').bytes,
    );
    await repo.add(application({ selectedAttachmentIds: ['foreign'] }));
    await expect(service.renderPdf('team', 'a1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('JobApplicationDossierService.renderZip', () => {
  async function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    return Buffer.concat(chunks);
  }

  it('JobApplicationDossierService_RenderZip_ContainsMergedPdfAndSeparateAttachments', async () => {
    const { repo, attachments, service } = makeService();
    await attachments.add(
      pdfAttachment('att1', 'Zeugnis.pdf').attachment,
      pdfAttachment('att1', 'Zeugnis.pdf').bytes,
    );
    await attachments.add(
      pdfAttachment('att2', 'Referenz.pdf').attachment,
      pdfAttachment('att2', 'Referenz.pdf').bytes,
    );
    await repo.add(application({ selectedAttachmentIds: ['att1', 'att2'] }));

    const { stream } = await service.renderZip('team', 'a1');
    const zip = new AdmZip(await collect(stream));
    const names = zip.getEntries().map((e) => e.entryName);
    // Merged PDF first, then the selected attachments in selection order.
    expect(names).toEqual(['Bewerbung.pdf', 'Zeugnis.pdf', 'Referenz.pdf']);
    expect(zip.getEntry('Bewerbung.pdf')?.getData().toString()).toBe('%PDF-merged');
  });

  it('JobApplicationDossierService_RenderZip_DeduplicatesNames', async () => {
    const { repo, attachments, service } = makeService();
    await attachments.add(pdfAttachment('a').attachment, pdfAttachment('a').bytes);
    await attachments.add(
      pdfAttachment('b', 'a.pdf').attachment,
      pdfAttachment('b', 'a.pdf').bytes,
    );
    await repo.add(application({ selectedAttachmentIds: ['a', 'b'] }));

    const { stream } = await service.renderZip('team', 'a1');
    const names = new AdmZip(await collect(stream)).getEntries().map((e) => e.entryName);
    expect(names[1]).toBe('a.pdf');
    expect(names[2]).toBe('a.pdf (2)');
  });

  it('JobApplicationDossierService_RenderZip_ValidatesBeforeStream_ThrowsWithoutOutput', async () => {
    const { repo, attachments, service } = makeService();
    // Non-PDF attachment → eager ValidationError before any stream exists.
    await attachments.add(
      {
        id: 'img',
        ownerId: 'team',
        talentId: 't1',
        name: 'x.png',
        contentType: 'image/png',
        size: 5,
        createdAt: '2026-06-25T10:00:00.000Z',
      },
      Buffer.from('PNG'),
    );
    await repo.add(application({ selectedAttachmentIds: ['img'] }));
    await expect(service.renderZip('team', 'a1')).rejects.toBeInstanceOf(ValidationError);
  });

  it('JobApplicationDossierService_RenderZip_ForeignAttachment_ThrowsNotFound', async () => {
    const { repo, attachments, service } = makeService();
    await attachments.add(
      pdfAttachment('foreign', 'f.pdf', 't2').attachment,
      pdfAttachment('foreign', 'f.pdf', 't2').bytes,
    );
    await repo.add(application({ selectedAttachmentIds: ['foreign'] }));
    await expect(service.renderZip('team', 'a1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('JobApplicationDossierService_RenderZip_ClientAbort_DestroysStream', async () => {
    const { repo, attachments, service } = makeService();
    await attachments.add(pdfAttachment('att1').attachment, pdfAttachment('att1').bytes);
    await repo.add(application({ selectedAttachmentIds: ['att1'] }));

    const { stream } = await service.renderZip('team', 'a1');

    // Mirror the controller's abort wiring (job-applications.module.ts §B11):
    //   stream.pipe(res);
    //   res.on('close', () => stream.destroy());
    //   stream.on('error', (err) => res.destroy(err));
    const resDestroy = jest.fn();
    const res = {
      destroy: resDestroy,
      closeHandler: undefined as (() => void) | undefined,
      on(event: string, cb: () => void) {
        if (event === 'close') this.closeHandler = cb;
        return this;
      },
    };
    stream.on('error', (err: unknown) => res.destroy(err));
    res.on('close', () => stream.destroy());

    const destroySpy = jest.spyOn(stream, 'destroy');

    // A client abort fires 'close' → the ZIP stream is destroyed (clean teardown).
    expect(stream.destroyed).toBe(false);
    res.closeHandler?.();
    expect(destroySpy).toHaveBeenCalled();

    // A stream error is forwarded to the response (res.destroy(err)), so the
    // error never becomes an unhandledRejection on the process.
    const boom = new Error('stream failed mid-zip');
    stream.emit('error', boom);
    expect(resDestroy).toHaveBeenCalledWith(boom);
  });

  it('JobApplicationDossierService_Filename_SlugifiesMandantAndFirma', async () => {
    const { repo, service } = makeService();
    await repo.add(
      application({ talentName: 'Ada Lovelace', postingCompany: 'Nordwind Logistik AG' }),
    );
    const pdf = await service.renderPdf('team', 'a1');
    expect(pdf.filename).toBe('Bewerbung_Ada_Lovelace_Nordwind_Logistik_AG.pdf');
    const zip = await service.renderZip('team', 'a1');
    expect(zip.filename).toBe('Bewerbung_Ada_Lovelace_Nordwind_Logistik_AG.zip');
  });

  it('JobApplicationDossierService_Filename_StripsIllegalCharsAndFallsBack', async () => {
    const { repo, service } = makeService();
    await repo.add(application({ talentName: 'Ada/Ne:y', postingCompany: '' }));
    const pdf = await service.renderPdf('team', 'a1');
    // postingCompany is empty → fallback "Firma"; "/" and ":" stripped.
    expect(pdf.filename).toBe('Bewerbung_AdaNey_Firma.pdf');
  });
});
