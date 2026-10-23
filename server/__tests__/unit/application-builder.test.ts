import { ApplicationBuilder } from '../../src/services/application-builder.js';
import type { Attachment } from '../../src/domain/attachment.js';
import type { ApplicationTarget } from '../../src/domain/application-target.js';
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
});
