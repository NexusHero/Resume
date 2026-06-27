import type { AppConfig } from '../config';
import type { ApplicationRepository } from '../ports/application-repository';
import type { AuditLog } from '../ports/audit-log';
import type { SavedSearchRepository } from '../ports/saved-search-repository';
import { FsApplicationRepository } from './fs-application-repository';
import { FsAuditLog } from './fs-audit-log';
import { FsSavedSearchRepository } from './fs-saved-search-repository';
import { SqlApplicationRepository } from './sql/sql-application-repository';
import { SqlAuditLog } from './sql/sql-audit-log';
import { SqlSavedSearchRepository } from './sql/sql-saved-search-repository';
import type { Db } from './sql/db';

/** The three storage ports, resolved to one backend. */
export interface Persistence {
  applicationRepository: ApplicationRepository;
  auditLog: AuditLog;
  savedSearchRepository: SavedSearchRepository;
}

/**
 * Chooses the storage backend from `config.store`. `sql` uses Postgres (requires
 * an open Db handle); anything else falls back to the file-backed adapters — the
 * default, so dev/CI and the offline app keep working with no database.
 */
export function createPersistence(deps: { config: AppConfig; db?: Db }): Persistence {
  const { config, db } = deps;
  if (config.store === 'sql') {
    if (!db) throw new Error('STORE=sql requires a database connection (DATABASE_URL)');
    return {
      applicationRepository: new SqlApplicationRepository({ db }),
      auditLog: new SqlAuditLog({ db }),
      savedSearchRepository: new SqlSavedSearchRepository({ db }),
    };
  }
  return {
    applicationRepository: new FsApplicationRepository({ config }),
    auditLog: new FsAuditLog({ config }),
    savedSearchRepository: new FsSavedSearchRepository({ config }),
  };
}
