/**
 * Strip HTML tags and collapse whitespace — job descriptions arrive as markup.
 * `<script>`/`<style>` bodies are removed first, so inline JS/CSS never counts
 * as "text" (a login/SPA page full of script must read as empty, AK-1.5).
 */
export function stripHtml(input: string): string {
  return (
    input
      // Remove `<script>…</script>` and `<style>…</style>` blocks **first**, before
      // the generic tag strip, so inline JS/CSS never counts as "text" (AK-1.5).
      // Robust to any case, arbitrary start-tag attributes, and — the reason this
      // is `[^>]*` rather than `\s*` — obfuscated end tags that carry junk between
      // the tag name and `>` (`</script\t\nbar>`); the lazy body also matches empty
      // `<script></script>` blocks.
      .replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * The full, untruncated text of an HTML page — the posting text extracted from
 * a URL (no 180-character snippet cut, unlike `snippetFrom`).
 */
export function htmlToText(html: string): string {
  return stripHtml(html);
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
