import { createPersistence } from '../../src/adapters/persistence-factory.js';
import { FsApplicationRepository } from '../../src/adapters/fs-application-repository.js';
import { FsMandateRepository } from '../../src/adapters/fs-mandate-repository.js';
import { FsTalentRepository } from '../../src/adapters/fs-talent-repository.js';
import { FsPlacementRepository } from '../../src/adapters/fs-placement-repository.js';
import { FsDocumentRepository } from '../../src/adapters/fs-document-repository.js';
import { FsAttachmentStore } from '../../src/adapters/fs-attachment-store.js';
import { FsUserRepository } from '../../src/adapters/fs-user-repository.js';
import { FsSessionStore } from '../../src/adapters/fs-session-store.js';
import { FsPasswordResetTokenStore } from '../../src/adapters/fs-password-reset-token-store.js';
import { SqlApplicationRepository } from '../../src/adapters/sql/sql-application-repository.js';
import { SqlSavedSearchRepository } from '../../src/adapters/sql/sql-saved-search-repository.js';
import { SqlMandateRepository } from '../../src/adapters/sql/sql-mandate-repository.js';
import { SqlTalentRepository } from '../../src/adapters/sql/sql-talent-repository.js';
import { SqlPlacementRepository } from '../../src/adapters/sql/sql-placement-repository.js';
import { SqlDocumentRepository } from '../../src/adapters/sql/sql-document-repository.js';
import { SqlAttachmentStore } from '../../src/adapters/sql/sql-attachment-store.js';
import { SqlUserRepository } from '../../src/adapters/sql/sql-user-repository.js';
import { SqlSessionStore } from '../../src/adapters/sql/sql-session-store.js';
import { SqlPasswordResetTokenStore } from '../../src/adapters/sql/sql-password-reset-token-store.js';
import { FsApiKeyStore } from '../../src/adapters/fs-api-key-store.js';
import { SqlApiKeyStore } from '../../src/adapters/sql/sql-api-key-store.js';
import { loadConfig } from '../../src/config.js';
import { FixedClock } from '../support/fakes.js';
import type { Db } from '../../src/adapters/sql/db.js';

const fakeDb = {} as Db;
const clock = new FixedClock();

describe('createPersistence', () => {
  it('DefaultStore_UsesFileAdapters', () => {
    const p = createPersistence({ config: loadConfig({}), clock });
    expect(p.applicationRepository).toBeInstanceOf(FsApplicationRepository);
    expect(p.mandateRepository).toBeInstanceOf(FsMandateRepository);
    expect(p.talentRepository).toBeInstanceOf(FsTalentRepository);
    expect(p.placementRepository).toBeInstanceOf(FsPlacementRepository);
    expect(p.documentRepository).toBeInstanceOf(FsDocumentRepository);
    expect(p.attachmentStore).toBeInstanceOf(FsAttachmentStore);
    expect(p.userRepository).toBeInstanceOf(FsUserRepository);
    expect(p.sessionStore).toBeInstanceOf(FsSessionStore);
    expect(p.passwordResetTokenStore).toBeInstanceOf(FsPasswordResetTokenStore);
    expect(p.apiKeyStore).toBeInstanceOf(FsApiKeyStore);
  });

  it('SqlStoreWithDb_UsesSqlAdapters', () => {
    const p = createPersistence({ config: loadConfig({ STORE: 'sql' }), clock, db: fakeDb });
    expect(p.applicationRepository).toBeInstanceOf(SqlApplicationRepository);
    expect(p.savedSearchRepository).toBeInstanceOf(SqlSavedSearchRepository);
    expect(p.mandateRepository).toBeInstanceOf(SqlMandateRepository);
    expect(p.talentRepository).toBeInstanceOf(SqlTalentRepository);
    expect(p.placementRepository).toBeInstanceOf(SqlPlacementRepository);
    expect(p.documentRepository).toBeInstanceOf(SqlDocumentRepository);
    expect(p.attachmentStore).toBeInstanceOf(SqlAttachmentStore);
    expect(p.userRepository).toBeInstanceOf(SqlUserRepository);
    expect(p.sessionStore).toBeInstanceOf(SqlSessionStore);
    expect(p.passwordResetTokenStore).toBeInstanceOf(SqlPasswordResetTokenStore);
    expect(p.apiKeyStore).toBeInstanceOf(SqlApiKeyStore);
  });

  it('SqlStoreWithoutDb_Throws', () => {
    expect(() => createPersistence({ config: loadConfig({ STORE: 'sql' }), clock })).toThrow(
      /requires a database/,
    );
  });
});
