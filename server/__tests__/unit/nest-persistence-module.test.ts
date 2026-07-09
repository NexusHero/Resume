import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { Persistence } from '../../src/adapters/persistence-factory.js';
import { CoreModule } from '../../src/nest/core.module.js';
import { PersistenceModule } from '../../src/nest/persistence.module.js';
import {
  PERSISTENCE,
  APPLICATION_REPOSITORY,
  USER_REPOSITORY,
  ASSISTANT_SUGGESTION_REPOSITORY,
  STAGE_TRANSITION_REPOSITORY,
} from '../../src/nest/tokens.js';

/**
 * The PersistenceModule re-exports each repository from the assembled bundle
 * under its own token. Overriding PERSISTENCE with a sentinel bundle proves the
 * token↔field bindings are correct without touching the filesystem (the real
 * createPersistence path is covered by the Postgres integration test).
 */
describe('PersistenceModule token bindings', () => {
  it('EachToken_ResolvesToItsBundleField', async () => {
    // A bundle whose every field is a tagged sentinel string.
    const bundle = new Proxy(
      {},
      { get: (_t, prop) => `repo:${String(prop)}` },
    ) as unknown as Persistence;

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, PersistenceModule],
    })
      .overrideProvider(PERSISTENCE)
      .useValue(bundle)
      .compile();

    expect(moduleRef.get(APPLICATION_REPOSITORY)).toBe('repo:applicationRepository');
    expect(moduleRef.get(USER_REPOSITORY)).toBe('repo:userRepository');
    expect(moduleRef.get(ASSISTANT_SUGGESTION_REPOSITORY)).toBe(
      'repo:assistantSuggestionRepository',
    );
    expect(moduleRef.get(STAGE_TRANSITION_REPOSITORY)).toBe('repo:stageTransitionRepository');
    await moduleRef.close();
  });
});
