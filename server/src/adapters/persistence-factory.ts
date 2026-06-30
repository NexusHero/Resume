import type { AppConfig } from '../config';
import type { ApplicationRepository } from '../ports/application-repository';
import type { AuditLog } from '../ports/audit-log';
import type { SavedSearchRepository } from '../ports/saved-search-repository';
import type { MandateRepository } from '../ports/mandate-repository';
import type { TalentRepository } from '../ports/talent-repository';
import type { PlacementRepository } from '../ports/placement-repository';
import type { UserRepository } from '../ports/user-repository';
import type { SessionStore } from '../ports/session-store';
import type { Clock } from '../ports/clock';
import { FsApplicationRepository } from './fs-application-repository';
import { FsAuditLog } from './fs-audit-log';
import { FsSavedSearchRepository } from './fs-saved-search-repository';
import { FsMandateRepository } from './fs-mandate-repository';
import { FsTalentRepository } from './fs-talent-repository';
import { FsPlacementRepository } from './fs-placement-repository';
import { FsUserRepository } from './fs-user-repository';
import { FsSessionStore } from './fs-session-store';
import { SqlApplicationRepository } from './sql/sql-application-repository';
import { SqlAuditLog } from './sql/sql-audit-log';
import { SqlSavedSearchRepository } from './sql/sql-saved-search-repository';
import { SqlMandateRepository } from './sql/sql-mandate-repository';
import { SqlTalentRepository } from './sql/sql-talent-repository';
import { SqlPlacementRepository } from './sql/sql-placement-repository';
import { SqlUserRepository } from './sql/sql-user-repository';
import { SqlSessionStore } from './sql/sql-session-store';
import type { Db } from './sql/db';

/** The storage ports, resolved to one backend. */
export interface Persistence {
  applicationRepository: ApplicationRepository;
  auditLog: AuditLog;
  savedSearchRepository: SavedSearchRepository;
  mandateRepository: MandateRepository;
  talentRepository: TalentRepository;
  placementRepository: PlacementRepository;
  userRepository: UserRepository;
  sessionStore: SessionStore;
}

/**
 * Chooses the storage backend from `config.store`. `sql` uses Postgres (requires
 * an open Db handle); anything else falls back to the file-backed adapters — the
 * default, so dev/CI and the offline app keep working with no database.
 */
export function createPersistence(deps: { config: AppConfig; clock: Clock; db?: Db }): Persistence {
  const { config, clock, db } = deps;
  if (config.store === 'sql') {
    if (!db) throw new Error('STORE=sql requires a database connection (DATABASE_URL)');
    return {
      applicationRepository: new SqlApplicationRepository({ db }),
      auditLog: new SqlAuditLog({ db }),
      savedSearchRepository: new SqlSavedSearchRepository({ db }),
      mandateRepository: new SqlMandateRepository({ db }),
      talentRepository: new SqlTalentRepository({ db }),
      placementRepository: new SqlPlacementRepository({ db }),
      userRepository: new SqlUserRepository({ db }),
      sessionStore: new SqlSessionStore({ db, clock, config }),
    };
  }
  return {
    applicationRepository: new FsApplicationRepository({ config }),
    auditLog: new FsAuditLog({ config }),
    savedSearchRepository: new FsSavedSearchRepository({ config }),
    mandateRepository: new FsMandateRepository({ config }),
    talentRepository: new FsTalentRepository({ config }),
    placementRepository: new FsPlacementRepository({ config }),
    userRepository: new FsUserRepository({ config }),
    sessionStore: new FsSessionStore({ config, clock }),
  };
}
