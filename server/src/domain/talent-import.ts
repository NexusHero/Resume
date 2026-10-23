import { z } from 'zod';
import type { DocumentContact, ResumeContent } from './talent-documents.js';

/**
 * Bulk CV import: a batch of PDF CVs, each base64-encoded, that become talents
 * in the pool. Bounded per request so one call can't queue an unbounded number
 * of LLM parses.
 */
export const importPdfsSchema = z.object({
  items: z
    .array(z.object({ dataBase64: z.string().min(1), filename: z.string().default('') }))
    .min(1, 'at least one CV is required')
    .max(20, 'import at most 20 CVs at a time'),
});
export type ImportPdfsInput = z.infer<typeof importPdfsSchema>;

/** One CV that became a talent. */
export interface ImportedTalent {
  ok: true;
  talentId: string;
  name: string;
  skillCount: number;
  /** `text` = "Text übernehmen (ohne KI)", `ai` = structured by the model. */
  mode: 'text' | 'ai';
  /** Present only in `ai` mode. */
  provider?: string;
  usage?: { inputTokens: number; outputTokens: number };
  /** Text mode: the CV exceeded the import limit and was cut. */
  truncated?: boolean;
  /** Text mode bulk import: the PDF stored as an attachment. */
  attachmentId?: string;
  /** 0 for a scanned/image-only PDF whose text layer could not be extracted. */
  extractedChars: number;
}

/** One CV that could not be imported (the batch continues past it). */
export interface FailedImport {
  ok: false;
  filename: string;
  error: string;
}

export type ImportResult = ImportedTalent | FailedImport;

/** Placeholder name for a CV whose parse/filename yielded no name. */
export const DEFAULT_IMPORT_NAME = 'Importierter Lebenslauf';

/**
 * Derive a display name from an uploaded CV filename: drop the `.pdf` suffix,
 * turn `_`/`-` into spaces and capitalise each word. Unusable names fall back to
 * the German placeholder (also used in AI mode).
 */
export function nameFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return DEFAULT_IMPORT_NAME;
  const named = base
    .split(' ')
    .map((w) => (w.length ? w.slice(0, 1).toLocaleUpperCase('de-DE') + w.slice(1) : w))
    .join(' ');
  return named || DEFAULT_IMPORT_NAME;
}

/** The display name for an imported talent: the parsed CV name, else a placeholder. */
export function importedName(contact: DocumentContact): string {
  return contact.name.trim() || DEFAULT_IMPORT_NAME;
}

/** Flatten a parsed resume's skill groups into a case-deduped skill list. */
export function importedSkills(resume: ResumeContent): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of resume.skillGroups) {
    for (const item of group.items) {
      const skill = item.trim();
      const key = skill.toLowerCase();
      if (skill && !seen.has(key)) {
        seen.add(key);
        out.push(skill);
      }
    }
  }
  return out;
}
