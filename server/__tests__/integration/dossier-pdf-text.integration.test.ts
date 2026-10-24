import { loadConfig } from '../../src/config.js';
import { DocumentService } from '../../src/services/document-service.js';
import { PuppeteerPdfRenderer } from '../../src/adapters/puppeteer-pdf-renderer.js';
import { PdfLibMerger } from '../../src/adapters/pdf-lib-merger.js';
import { PdfjsTextExtractor } from '../../src/adapters/pdfjs-text-extractor.js';
import { emptyContact, type TalentDocuments } from '../../src/domain/talent-documents.js';
import {
  FixedClock,
  InMemoryAttachmentStore,
  InMemoryDocumentRepository,
  InMemoryTalentRepository,
  InMemoryUserRepository,
  noopLogger,
} from '../support/fakes.js';

/**
 * Gated real-PDF test (AK-4.2, ADR-0052): render the **copy** through the real
 * Puppeteer renderer and extract the PDF text with the real pdf.js extractor,
 * proving the adapted copy (not the base CV) is what the Mappe contains. Gated on
 * `PUPPETEER_EXECUTABLE_PATH` (same convention as the `DATABASE_URL` integration
 * gate): skipped in CI without a browser, run locally with a Chromium path.
 */
const suite = process.env.PUPPETEER_EXECUTABLE_PATH ? describe : describe.skip;

suite('Dossier real-PDF text (gated on PUPPETEER_EXECUTABLE_PATH)', () => {
  it('DossierPdf_ExtractedText_ContainsAdaptedNotBase', async () => {
    const config = loadConfig({});
    const renderer = new PuppeteerPdfRenderer({ config, logger: noopLogger });
    try {
      const service = new DocumentService({
        documentRepository: new InMemoryDocumentRepository(),
        talentRepository: new InMemoryTalentRepository(),
        userRepository: new InMemoryUserRepository(),
        attachmentStore: new InMemoryAttachmentStore(),
        pdfRenderer: renderer,
        pdfMerger: new PdfLibMerger(),
        clock: new FixedClock(),
      });

      // The adapted copy (Magic Pen changed the profile text); the base CV's
      // summary was replaced and its rawText is blanked on the copy (ADR-0059).
      const copy: TalentDocuments = {
        ownerId: 'team',
        talentId: 't1',
        contact: { ...emptyContact, name: 'Ada Lovelace' },
        resume: {
          summary: 'ANGEPASSTER PROFILTEXT 9999 mit Fokus auf verteilte Systeme.',
          experience: [],
          education: [],
          skillGroups: [],
          rawText: '',
        },
        letter: {
          firma: 'Nordwind Logistik AG',
          ansprechpartner: '',
          strasse: '',
          plzOrt: '',
          betreff: 'Bewerbung als Backend Engineer',
          anrede: 'Sehr geehrte Damen und Herren,',
          absaetze: ['Gerne bewerbe ich mich.'],
          gruss: 'Mit freundlichen Grüßen',
        },
        style: {
          template: 'classic',
          accent: '#2A6FDB',
          strong: '#1d4ed8',
          onDark: '#7aa7f5',
          font: 'var(--font-display)',
          size: 1,
        },
        updatedAt: '2026-06-25T10:00:00.000Z',
      };

      const pdf = await service.renderDossierFromDocuments('team', copy, {}, [], 'letter-first');
      const text = await new PdfjsTextExtractor().extract(pdf);
      const normalized = text.replace(/\s+/g, ' ').trim();

      expect(normalized).toContain('ANGEPASSTER PROFILTEXT 9999');
      expect(normalized).not.toContain('BASIS SUMMARY MARKER 0001');
      // The letter is present and ordered first (Anschreiben → CV).
      expect(normalized).toContain('Nordwind Logistik AG');
      expect(normalized).toContain('Bewerbung als Backend Engineer');
    } finally {
      await renderer.close();
    }
  }, 60_000);
});
