import type { Versioner } from '../ports/versioner';

/**
 * A versioner that does nothing. Used when the store is not the file system
 * (e.g. Postgres): there are no JSON files to commit, so version control of the
 * data store is neither possible nor meaningful.
 */
export class NoopVersioner implements Versioner {
  async commit(): Promise<string | null> {
    return null;
  }
}
