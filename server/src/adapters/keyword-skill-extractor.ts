import type { SkillExtractor } from '../ports/skill-extractor.js';

/** One canonical skill plus the surface forms that should map to it. */
export interface SkillDefinition {
  name: string;
  aliases?: string[];
}

/**
 * Default tech-skill taxonomy. Canonical name first; aliases are alternative
 * spellings found in postings. Kept deliberately conservative — only terms
 * unambiguous enough to match on a word boundary without false positives.
 */
export const DEFAULT_SKILL_TAXONOMY: SkillDefinition[] = [
  { name: 'C++', aliases: ['cpp'] },
  { name: 'C#', aliases: ['csharp'] },
  { name: 'Rust' },
  { name: 'Go', aliases: ['golang'] },
  { name: 'Java' },
  { name: 'Python' },
  { name: 'TypeScript' },
  { name: 'JavaScript' },
  { name: 'Scala' },
  { name: 'Kotlin' },
  { name: 'Kafka' },
  { name: 'PostgreSQL', aliases: ['postgres'] },
  { name: 'MySQL' },
  { name: 'MongoDB', aliases: ['mongo'] },
  { name: 'Redis' },
  { name: 'Kubernetes', aliases: ['k8s'] },
  { name: 'Docker' },
  { name: 'AWS', aliases: ['amazon web services'] },
  { name: 'Azure' },
  { name: 'GCP', aliases: ['google cloud'] },
  { name: 'gRPC' },
  { name: 'GraphQL' },
  { name: 'React' },
  { name: 'Node.js', aliases: ['nodejs', 'node'] },
  { name: 'Spring' },
  { name: 'Terraform' },
  { name: 'Linux' },
  { name: 'Microservices', aliases: ['microservice'] },
  { name: 'Distributed Systems', aliases: ['distributed system'] },
  { name: 'Observability' },
];

/** Escape a surface form for use as a literal inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\#-]/g, '\\$&');
}

/**
 * Boundary that treats letters, digits and the in-name symbols `+`/`#` as "word"
 * characters — so "C++" does not match inside "C+++", "C#" not inside "C#5", and
 * "Java" not inside "JavaScript". A `.` is left as an ordinary boundary so a
 * sentence-ending "distributed systems." still matches (multi-char names like
 * "Node.js" carry their own dot via their literal pattern).
 */
function boundaried(surface: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9+#])${escapeRegExp(surface)}(?![A-Za-z0-9+#])`, 'i');
}

/** Rule-based SkillExtractor: scans text for taxonomy terms on word boundaries. */
export class KeywordSkillExtractor implements SkillExtractor {
  private readonly matchers: { name: string; patterns: RegExp[] }[];

  constructor(taxonomy: SkillDefinition[] = DEFAULT_SKILL_TAXONOMY) {
    this.matchers = taxonomy.map((s) => ({
      name: s.name,
      patterns: [s.name, ...(s.aliases ?? [])].map(boundaried),
    }));
  }

  extract(text: string): string[] {
    if (!text.trim()) return [];
    const found: string[] = [];
    for (const m of this.matchers) {
      if (m.patterns.some((re) => re.test(text))) found.push(m.name);
    }
    return found;
  }
}
