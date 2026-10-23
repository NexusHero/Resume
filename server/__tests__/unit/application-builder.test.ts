import { ApplicationBuilder } from '../../src/services/application-builder.js';
import type { Attachment } from '../../src/domain/attachment.js';
import type { ApplicationTarget } from '../../src/domain/application-target.js';
import type { ApplicationPayload } from '../../src/domain/assistant.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';
import type { DocumentAiService } from '../../src/services/document-ai-service.js';
import type { DocumentService } from '../../src/services/document-service.js';
import type { AttachmentService } from '../../src/services/attachment-service.js';

const target: ApplicationTarget = {
  ref: 'm1',
  source: 'mandates',
  role: 'Engineer',
  company: 'Helio',
  location: 'Berlin',
  jobText: 'React',
  lang: 'en',
};

const att = (id: string, name: string): Attachment => ({
  id,
  ownerId: 'team',
  talentId: 't1',
  name,
  contentType: 'application/pdf',
  size: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('ApplicationBuilder attachments', () => {
  it('ApplicationBuilder_ImportedCvAttachment_IsNotAttached', async () => {
    const ai = {
      tailorForMandate: async () => ({
        summary: 'Tuned',
        paragraphs: ['A', 'B', 'C'],
        provider: 'claude',
        grounding: { grounded: true, unsupported: [] },
      }),
    } as unknown as DocumentAiService;
    const documents = { get: async () => ({}) } as unknown as DocumentService;
    const attachments = {
      list: async () => [att('a1', 'Zeugnis.pdf'), att('a2', 'Original-Lebenslauf (Import).pdf')],
    } as unknown as AttachmentService;

    const payload = await new ApplicationBuilder({
      documentAiService: ai,
      documentService: documents,
      attachmentService: attachments,
    }).build('team', 'u1', target, 't1', 88);

    expect(payload.attachmentIds).toEqual(['a1']);
    expect(payload.attachmentIds).not.toContain('a2');
  });

  it('ApplicationBuilder_Dossier_ExcludesRawText', async () => {
    // The Bewerbungsmappe renders from a snapshot with the raw CV text blanked
    // (ADR-0057/0019) — the internal raw text must never reach the dossier.
    let receivedSnapshot: TalentDocuments | undefined;
    const documents = {
      get: async (): Promise<TalentDocuments> => ({
        ownerId: 'team',
        talentId: 't1',
        contact: { name: 'Lena', role: '', email: '', phone: '', location: '', linkedin: '' },
        resume: {
          summary: 'Old summary',
          experience: [],
          education: [],
          skillGroups: [],
          rawText: 'CONFIDENTIAL-RAW-CV-CONTENT',
        },
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
          template: 'classic',
          accent: '#000',
          strong: '#000',
          onDark: '#000',
          font: 'x',
          size: 1,
        },
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      renderDossierFromDocuments: async (
        _scope: string,
        snapshot: TalentDocuments,
      ): Promise<Buffer> => {
        receivedSnapshot = snapshot;
        return Buffer.from('pdf');
      },
    } as unknown as DocumentService;
    const builder = new ApplicationBuilder({
      documentAiService: { tailorForMandate: async () => ({}) } as unknown as DocumentAiService,
      documentService: documents,
      attachmentService: { list: async () => [] } as unknown as AttachmentService,
    });

    const payload: ApplicationPayload = {
      source: 'mandates',
      targetRef: 'm1',
      role: 'Engineer',
      company: 'Helio',
      location: 'Berlin',
      mandateId: 'm1',
      jobText: 'React',
      lang: 'en',
      score: 88,
      summary: 'Tuned summary',
      paragraphs: ['A', 'B', 'C'],
      attachmentIds: [],
      provider: 'claude',
      ungroundedCount: 0,
    };
    await builder.renderDossier('team', 't1', payload);

    expect(receivedSnapshot?.resume.rawText).toBe('');
    expect(receivedSnapshot?.resume.summary).toBe('Tuned summary');
  });
});
