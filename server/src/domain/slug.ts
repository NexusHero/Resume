/** ASCII-safe slug used for archived PDF filenames. */
export function slug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'application'
  );
}

/**
 * A safe filename fragment for the dossier download (Plan §5): strips path
 * separators, control characters and the Windows-illegal set `\ / : * ? " < > |`,
 * and collapses whitespace to `_`. Returns `fallback` when nothing usable
 * remains.
 */
export function safeFilename(value: string, fallback: string): string {
  const cleaned = String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}
