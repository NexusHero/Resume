import { tokenize } from './ats-ai';

/**
 * A lightweight, deterministic semantic layer over skill matching. Pure keyword
 * overlap misses that "React" and "Vue" are both frontend, or that "Postgres"
 * answers a "SQL" requirement. This adds two offline signals on top of exact
 * matching:
 *   1. a curated skill ontology — tokens in the same cluster count as related;
 *   2. fuzzy string similarity (trigram Dice) — catches spelling variants like
 *      "TypeScript"/"Typescript" or "NodeJS"/"Node.js".
 * No model, no network: transparent and reproducible, in keeping with the rest
 * of the matcher.
 */

/** Curated clusters of related skills (single lowercase tokens). */
const CLUSTERS: string[][] = [
  ['react', 'reactjs', 'vue', 'vuejs', 'angular', 'svelte', 'frontend', 'javascript', 'typescript'],
  ['node', 'nodejs', 'express', 'nestjs', 'backend', 'deno'],
  ['c++', 'cpp', 'rust', 'embedded', 'systems'],
  ['c#', 'csharp', 'dotnet', '.net', 'asp'],
  ['python', 'django', 'flask', 'fastapi', 'pandas'],
  ['java', 'spring', 'kotlin', 'jvm'],
  ['go', 'golang'],
  ['aws', 'azure', 'gcp', 'cloud', 'terraform', 'kubernetes', 'docker', 'devops'],
  ['postgres', 'postgresql', 'mysql', 'sql', 'mariadb', 'mongodb', 'nosql', 'database'],
  ['figma', 'sketch', 'ux', 'ui', 'prototyping', 'wireframing'],
  ['grpc', 'protobuf', 'rest', 'graphql', 'api', 'openapi'],
  ['ml', 'ai', 'pytorch', 'tensorflow', 'nlp', 'llm'],
];

/** token → cluster index, built once. */
const TOKEN_CLUSTER = new Map<string, number>();
for (let i = 0; i < CLUSTERS.length; i++) {
  for (const token of CLUSTERS[i] as string[]) TOKEN_CLUSTER.set(token, i);
}

/** Char-trigram Dice coefficient of two strings (0–1). */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string): Set<string> => {
    const padded = `  ${s.toLowerCase()} `;
    const out = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
    return out;
  };
  if (a.length < 2 || b.length < 2) return a.toLowerCase() === b.toLowerCase() ? 1 : 0;
  const ga = grams(a);
  const gb = grams(b);
  let shared = 0;
  for (const g of ga) if (gb.has(g)) shared += 1;
  return (2 * shared) / (ga.size + gb.size);
}

/** The set of ontology clusters present in a job's tokens. */
export function jobClusters(jobTokens: Set<string>): Set<number> {
  const out = new Set<number>();
  for (const t of jobTokens) {
    const c = TOKEN_CLUSTER.get(t);
    if (c !== undefined) out.add(c);
  }
  return out;
}

const FUZZY_THRESHOLD = 0.6;

/**
 * Does a candidate skill answer anything the job asks for? Matches if any of the
 * skill's tokens is mentioned exactly, is a clear substring, shares an ontology
 * cluster, or is fuzzily similar to a job token.
 */
export function skillMatchesJob(
  skill: string,
  jobTokens: Set<string>,
  clusters: Set<number>,
): boolean {
  for (const st of tokenize(skill)) {
    if (jobTokens.has(st)) return true; // exact
    const cluster = TOKEN_CLUSTER.get(st);
    if (cluster !== undefined && clusters.has(cluster)) return true; // ontology
    for (const jt of jobTokens) {
      // substring only for reasonably long tokens, to avoid noise
      if (st.length >= 4 && jt.length >= 4 && (st.includes(jt) || jt.includes(st))) return true;
      if (trigramSimilarity(st, jt) >= FUZZY_THRESHOLD) return true; // fuzzy
    }
  }
  return false;
}
