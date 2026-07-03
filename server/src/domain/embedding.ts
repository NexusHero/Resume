/**
 * Local text embeddings for hybrid matching (ADR-0017): deterministic hashed
 * lexical vectors — word unigrams plus character trigrams, signed-feature-
 * hashed into a fixed-dimension vector and L2-normalized. No model download,
 * no network, no per-call cost, and no candidate text ever leaves the server
 * (DSGVO). Not a neural embedding — near-synonyms only meet through shared
 * character n-grams — but robust to inflections, compounds and typos, which
 * is where pure token matching loses candidates. A neural model can replace
 * this behind the EmbeddingProvider port without touching any caller.
 */

export const EMBEDDING_DIM = 256;

/** FNV-1a 32-bit — fast, stable, good enough dispersion for feature hashing. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Lowercased word tokens; umlauts kept so German text hashes stably. */
function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-zà-öø-ÿß0-9+#.]+/g) ?? []).filter((w) => w.length > 1);
}

/** A word's features: the word itself plus its padded character trigrams. */
function features(word: string): string[] {
  const padded = `^${word}$`;
  const grams: string[] = [`w:${word}`];
  for (let i = 0; i + 3 <= padded.length; i++) grams.push(`g:${padded.slice(i, i + 3)}`);
  return grams;
}

/**
 * Embed a text: every feature lands in a hashed bucket with a hash-derived
 * sign (cancels collision bias), weighted by log term frequency; the result
 * is L2-normalized so cosine reduces to a dot product.
 */
export function embed(text: string): number[] {
  const counts = new Map<string, number>();
  for (const word of words(text)) {
    for (const f of features(word)) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  for (const [feature, count] of counts) {
    const h = fnv1a(feature);
    const sign = (h & 1) === 1 ? 1 : -1;
    v[(h >>> 1) % EMBEDDING_DIM]! += sign * (1 + Math.log(count));
  }
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

/** Cosine similarity of two embeddings (–1…1; 0 when either text was empty). */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i]! * b[i]!;
  return dot;
}

/** Cosine mapped to a 0–100 score; negative similarity is honest zero. */
export function similarityScore(a: number[], b: number[]): number {
  return Math.round(Math.max(0, cosine(a, b)) * 100);
}
