/**
 * Detects skills mentioned in free job text (title + description). Lets the
 * matcher work on postings that arrive without structured skill tags — many
 * boards (e.g. Bundesagentur) provide none. The rule-based adapter is the
 * default; an LLM-backed adapter can implement the same port later.
 */
export interface SkillExtractor {
  extract(text: string): string[];
}
