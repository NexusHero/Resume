import path from 'node:path';

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
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rootDir = path.resolve(__dirname, '..', '..');
  const storeDir = path.join(rootDir, 'bewerbungen');
  return {
    port: Number(env.PORT ?? 4178),
    rootDir,
    storeDir,
    logFile: path.join(storeDir, 'log.json'),
    historyFile: path.join(storeDir, 'history.jsonl'),
    staticDir: rootDir,
    versionedPaths: ['bewerbungen'],
  };
}
