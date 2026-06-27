/** Strip HTML tags and collapse whitespace — job descriptions arrive as markup. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trim to at most `max` characters on a word boundary, with an ellipsis. */
export function truncate(input: string, max = 180): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Strip markup then truncate — the snippet shown in a job row. */
export function snippetFrom(html: string | undefined | null, max = 180): string {
  if (!html) return '';
  return truncate(stripHtml(html), max);
}
