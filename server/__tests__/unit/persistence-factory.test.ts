import { createPersistence } from '../../src/adapters/persistence-factory';
import { FsApplicationRepository } from '../../src/adapters/fs-application-repository';
import { FsMandateRepository } from '../../src/adapters/fs-mandate-repository';
import { FsTalentRepository } from '../../src/adapters/fs-talent-repository';
import { FsPlacementRepository } from '../../src/adapters/fs-placement-repository';
import { FsUserRepository } from '../../src/adapters/fs-user-repository';
import { FsSessionStore } from '../../src/adapters/fs-session-store';
import { SqlApplicationRepository } from '../../src/adapters/sql/sql-application-repository';
import { SqlSavedSearchRepository } from '../../src/adapters/sql/sql-saved-search-repository';
import { SqlMandateRepository } from '../../src/adapters/sql/sql-mandate-repository';
import { SqlTalentRepository } from '../../src/adapters/sql/sql-talent-repository';
import { SqlPlacementRepository } from '../../src/adapters/sql/sql-placement-repository';
import { SqlUserRepository } from '../../src/adapters/sql/sql-user-repository';
import { SqlSessionStore } from '../../src/adapters/sql/sql-session-store';
import { loadConfig } from '../../src/config';
import { FixedClock } from '../support/fakes';
import type { Db } from '../../src/adapters/sql/db';

const fakeDb = {} as Db;
const clock = new FixedClock();

describe('createPersistence', () => {
  it('DefaultStore_UsesFileAdapters', () => {
    const p = createPersistence({ config: loadConfig({}), clock });
    expect(p.applicationRepository).toBeInstanceOf(FsApplicationRepository);
    expect(p.mandateRepository).toBeInstanceOf(FsMandateRepository);
    expect(p.talentRepository).toBeInstanceOf(FsTalentRepository);
    expect(p.placementRepository).toBeInstanceOf(FsPlacementRepository);
    expect(p.userRepository).toBeInstanceOf(FsUserRepository);
    expect(p.sessionStore).toBeInstanceOf(FsSessionStore);
  });

  it('SqlStoreWithDb_UsesSqlAdapters', () => {
    const p = createPersistence({ config: loadConfig({ STORE: 'sql' }), clock, db: fakeDb });
    expect(p.applicationRepository).toBeInstanceOf(SqlApplicationRepository);
    expect(p.savedSearchRepository).toBeInstanceOf(SqlSavedSearchRepository);
    expect(p.mandateRepository).toBeInstanceOf(SqlMandateRepository);
    expect(p.talentRepository).toBeInstanceOf(SqlTalentRepository);
    expect(p.placementRepository).toBeInstanceOf(SqlPlacementRepository);
    expect(p.userRepository).toBeInstanceOf(SqlUserRepository);
    expect(p.sessionStore).toBeInstanceOf(SqlSessionStore);
  });

  it('SqlStoreWithoutDb_Throws', () => {
    expect(() => createPersistence({ config: loadConfig({ STORE: 'sql' }), clock })).toThrow(
      /requires a database/,
    );
  });
});
