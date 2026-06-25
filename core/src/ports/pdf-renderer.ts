/** Options for rendering the cover letter with a concrete recipient. */
export interface CoverLetterOptions {
  company?: string;
  contactName?: string;
  street?: string;
  postalCodeCity?: string;
  position?: string;
  reference?: string;
  location?: string;
  date?: string;
}

/** Renders the self-contained HTML documents to print-quality PDF and merges them. */
export interface PdfRenderer {
  renderCv(options: { language: 'de' | 'en' }): Promise<Buffer>;
  renderCoverLetter(options: CoverLetterOptions): Promise<Buffer>;
  merge(parts: Buffer[], options?: { title?: string }): Promise<Buffer>;
}
