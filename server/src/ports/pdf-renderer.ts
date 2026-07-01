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

/** Renders the self-contained HTML documents to print-quality PDF. */
export interface PdfRenderer {
  renderCv(options: { language: 'de' | 'en' }): Promise<Buffer>;
  renderCoverLetter(options: CoverLetterOptions): Promise<Buffer>;
  /** Render an arbitrary self-contained HTML string (e.g. built from a talent's
   *  saved documents) to PDF. */
  renderHtml(html: string): Promise<Buffer>;
}
