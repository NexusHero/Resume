/**
 * Deterministic language detection for the two languages the product generates
 * in: German and English. The output language of a generated document (pitch,
 * outreach, cover letter, …) follows the **language of the job ad**, not the app
 * UI — a German posting gets a German application, an English posting an English
 * one. Detection is offline and reproducible (no model, no network), in keeping
 * with the rest of the domain (see ADR-0005/0007).
 */
export type OutputLang = 'de' | 'en';

/** Whole-word markers that strongly signal each language. */
const DE_WORDS = new Set([
  'und',
  'oder',
  'der',
  'die',
  'das',
  'mit',
  'für',
  'von',
  'ist',
  'sind',
  'wir',
  'sie',
  'ihre',
  'ihr',
  'nicht',
  'auch',
  'als',
  'eine',
  'einen',
  'einem',
  'im',
  'zu',
  'bei',
  'aus',
  'auf',
  'dem',
  'den',
  'des',
  'erfahrung',
  'kenntnisse',
  'aufgaben',
  'anforderungen',
  'bewerbung',
  'stelle',
  'unternehmen',
  'mitarbeiter',
  'abgeschlossenes',
  'studium',
  'gerne',
  'sowie',
  'werden',
  'haben',
]);
const EN_WORDS = new Set([
  'the',
  'and',
  'or',
  'with',
  'for',
  'from',
  'is',
  'are',
  'we',
  'you',
  'your',
  'not',
  'also',
  'as',
  'a',
  'an',
  'in',
  'to',
  'at',
  'on',
  'of',
  'experience',
  'skills',
  'tasks',
  'requirements',
  'application',
  'role',
  'company',
  'team',
  'degree',
  'years',
  'you’ll',
  'will',
  'have',
  'our',
  'this',
  'that',
]);

/**
 * Detect whether `text` is German or English. Falls back to `fallback`
 * (default `'en'`) when there is no usable signal (empty or too short).
 */
export function detectLanguage(text: string, fallback: OutputLang = 'en'): OutputLang {
  const raw = (text ?? '').toLowerCase();
  if (raw.trim().length < 3) return fallback;

  // German-specific letters are a strong, cheap signal.
  let de = 0;
  let en = 0;
  const umlauts = (raw.match(/[äöüß]/g) || []).length;
  de += umlauts * 2;

  for (const token of raw.split(/[^a-zà-ÿ’']+/).filter(Boolean)) {
    if (DE_WORDS.has(token)) de += 1;
    if (EN_WORDS.has(token)) en += 1;
  }

  if (de === en) return fallback;
  return de > en ? 'de' : 'en';
}
