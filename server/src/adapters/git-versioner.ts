import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AppConfig } from '../config';
import type { Logger } from '../ports/logger';
import type { Versioner } from '../ports/versioner';

const exec = promisify(execFile);

/** Commits the store's tracked paths to git, scoped so unrelated work is never touched. */
export class GitVersioner implements Versioner {
  private readonly cwd: string;
  private readonly paths: string[];
  private readonly logger: Logger;

  constructor(deps: { config: AppConfig; logger: Logger }) {
    this.cwd = deps.config.rootDir;
    this.paths = deps.config.versionedPaths;
    this.logger = deps.logger;
  }

  async commit(message: string): Promise<string | null> {
    try {
      await exec('git', ['rev-parse', '--is-inside-work-tree'], { cwd: this.cwd });
    } catch {
      return null;
    }
    try {
      await exec('git', ['add', '--', ...this.paths], { cwd: this.cwd });
      await exec('git', ['commit', '-m', message, '--', ...this.paths], { cwd: this.cwd });
      const { stdout } = await exec('git', ['rev-parse', '--short', 'HEAD'], { cwd: this.cwd });
      return stdout.trim();
    } catch (err) {
      // Nothing staged / git not configured — not fatal for the API call.
      this.logger.debug({ err: String(err) }, 'git commit skipped');
      return null;
    }
  }
}
