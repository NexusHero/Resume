import path from 'node:path';
import type { CandidateProfile } from './domain/skill';

/** Runtime configuration, resolved from the environment and repo layout. */
export interface AppConfig {
  port: number;
  rootDir: string;
  storeDir: string;
  logFile: string;
  historyFile: string;
  staticDir: string;
  /** Repo-relative paths the Versioner stages on each change. */
  versionedPaths: string[];
  /** The searching candidate's skills (drives job matching). */
  candidateProfile: CandidateProfile;
  /** Pre-configured search run when /api/v1/jobs is called with no params. */
  defaultJobSearch: Record<string, unknown>;
}

/**
 * The candidate's skill set, derived from the CV. Core competencies carry more
 * weight so a job matching them scores higher than one matching peripheral tags.
 */
const CANDIDATE_PROFILE: CandidateProfile = {
  skills: [
    { name: 'C++', weight: 3 },
    { name: 'Rust', weight: 3 },
    { name: 'Distributed Systems', weight: 2 },
    { name: 'gRPC', weight: 2 },
    { name: 'Kubernetes', weight: 1 },
    { name: 'Go', weight: 1 },
    { name: 'AWS', weight: 1 },
    { name: 'PostgreSQL', weight: 1 },
    { name: 'Microservices', weight: 1 },
    { name: 'Remote', weight: 1 },
  ],
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rootDir = path.resolve(__dirname, '..', '..');
  const storeDir = path.join(rootDir, 'archive', 'bewerbungen');
  return {
    port: Number(env.PORT ?? 4178),
    rootDir,
    storeDir,
    logFile: path.join(storeDir, 'log.json'),
    historyFile: path.join(storeDir, 'history.jsonl'),
    staticDir: rootDir,
    versionedPaths: ['archive/bewerbungen'],
    candidateProfile: CANDIDATE_PROFILE,
    defaultJobSearch: { threshold: 80 },
  };
}
