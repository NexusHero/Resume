/** Merges several PDF documents into one. */
export interface PdfMerger {
  merge(parts: Buffer[], options?: { title?: string }): Promise<Buffer>;
}
