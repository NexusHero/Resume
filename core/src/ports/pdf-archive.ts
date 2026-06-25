/** Stores finished application PDFs and returns their repo-relative path. */
export interface PdfArchive {
  /** Persist the PDF bytes under a derived name; returns the relative path. */
  save(filenameHint: string, bytes: Buffer): Promise<string>;
}
