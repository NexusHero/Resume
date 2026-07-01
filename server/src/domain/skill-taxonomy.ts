/**
 * Skill canonicalization — the data-quality foundation. Free-text skills come in
 * many spellings ("React.js", "ReactJS", "react"); left raw they fragment
 * matching, ATS and analytics. Mapping each to one canonical form makes every
 * downstream feature see the same skill. Deterministic and offline: a curated
 * alias table, no model.
 */

/** alias (lowercased) → canonical display form. */
const ALIASES: Record<string, string> = {
  react: 'React',
  reactjs: 'React',
  'react.js': 'React',
  vue: 'Vue',
  vuejs: 'Vue',
  'vue.js': 'Vue',
  angular: 'Angular',
  angularjs: 'Angular',
  svelte: 'Svelte',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  express: 'Express',
  nestjs: 'NestJS',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  'c++': 'C++',
  cpp: 'C++',
  'c#': 'C#',
  csharp: 'C#',
  '.net': '.NET',
  dotnet: '.NET',
  python: 'Python',
  django: 'Django',
  flask: 'Flask',
  java: 'Java',
  spring: 'Spring',
  kotlin: 'Kotlin',
  golang: 'Go',
  go: 'Go',
  rust: 'Rust',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  docker: 'Docker',
  terraform: 'Terraform',
  aws: 'AWS',
  'amazon web services': 'AWS',
  gcp: 'GCP',
  'google cloud': 'GCP',
  azure: 'Azure',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  redis: 'Redis',
  sql: 'SQL',
  nosql: 'NoSQL',
  graphql: 'GraphQL',
  grpc: 'gRPC',
  rest: 'REST',
  restful: 'REST',
  'rest api': 'REST',
  protobuf: 'Protobuf',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',
  figma: 'Figma',
  sketch: 'Sketch',
  pytorch: 'PyTorch',
  tensorflow: 'TensorFlow',
};

/** Canonicalize one skill; unknown skills are returned trimmed, casing intact. */
export function canonicalizeSkill(skill: string): string {
  const trimmed = (skill ?? '').trim();
  return ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * Canonicalize a list of skills and drop duplicates that collapse to the same
 * canonical form (case-insensitive), keeping the canonical display.
 */
export function canonicalizeSkills(skills: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const s of skills) {
    const canonical = canonicalizeSkill(s);
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, canonical);
  }
  return [...byKey.values()];
}
