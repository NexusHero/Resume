import { createPersistence } from '../../src/adapters/persistence-factory';
import { FsApplicationRepository } from '../../src/adapters/fs-application-repository';
import { SqlApplicationRepository } from '../../src/adapters/sql/sql-application-repository';
import { SqlSavedSearchRepository } from '../../src/adapters/sql/sql-saved-search-repository';
import { loadConfig } from '../../src/config';
import type { Db } from '../../src/adapters/sql/db';

const fakeDb = {} as Db;

describe('createPersistence', () => {
  it('DefaultStore_UsesFileAdapters', () => {
    const p = createPersistence({ config: loadConfig({}) });
    expect(p.applicationRepository).toBeInstanceOf(FsApplicationRepository);
  });

  it('SqlStoreWithDb_UsesSqlAdapters', () => {
    const p = createPersistence({ config: loadConfig({ STORE: 'sql' }), db: fakeDb });
    expect(p.applicationRepository).toBeInstanceOf(SqlApplicationRepository);
    expect(p.savedSearchRepository).toBeInstanceOf(SqlSavedSearchRepository);
  });

  it('SqlStoreWithoutDb_Throws', () => {
    expect(() => createPersistence({ config: loadConfig({ STORE: 'sql' }) })).toThrow(
      /requires a database/,
    );
  });
});
