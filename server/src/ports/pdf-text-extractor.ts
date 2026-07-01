/** Extracts the plain text layer from a PDF (for parsing an uploaded CV). */
export interface PdfTextExtractor {
  /**
   * Return the concatenated text of every page. A scanned/image-only PDF has no
   * text layer and yields an empty string — callers should handle that.
   */
  extract(pdf: Buffer): Promise<string>;
}
