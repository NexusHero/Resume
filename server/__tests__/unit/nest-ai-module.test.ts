import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Global, Module, type Provider } from '@nestjs/common';
import { CoreModule } from '../../src/nest/core.module.js';
import { AiModule } from '../../src/nest/ai/ai.module.js';
import {
  DOCUMENT_AI_SERVICE,
  COVER_LETTER_SERVICE,
  LLM_FEATURE_RUNNER,
  LLM_SERVICE,
  API_KEY_STORE,
  USER_REPOSITORY,
  USAGE_METER,
  PDF_TEXT_EXTRACTOR,
  ARTIFACT_LOG_REPOSITORY,
  INTERVIEW_OBSERVATION_REPOSITORY,
  DOCUMENT_REPOSITORY,
  TALENT_REPOSITORY,
  ATTACHMENT_STORE,
  PDF_RENDERER,
  PDF_MERGER,
  AUTH_SERVICE,
  PLAN_PROVIDER,
} from '../../src/nest/tokens.js';

/**
 * Wiring check for the AI feature module (ADR-0051/0022): with the leaf ports
 * stubbed, the LlmFeatureRunner, the five feature services and the DocumentAi
 * facade + CoverLetterService all construct and resolve. (Behaviour is covered by
 * each service's own unit tests; the AI controllers exercise them end to end.)
 */
describe('AiModule wiring', () => {
  it('ResolvesTheFacadeAndCoverLetterAndRunner', async () => {
    const stub = () => ({}) as never;
    const leafTokens = [
      LLM_SERVICE,
      API_KEY_STORE,
      USER_REPOSITORY,
      USAGE_METER,
      PDF_TEXT_EXTRACTOR,
      ARTIFACT_LOG_REPOSITORY,
      INTERVIEW_OBSERVATION_REPOSITORY,
      DOCUMENT_REPOSITORY,
      TALENT_REPOSITORY,
      ATTACHMENT_STORE,
      PDF_RENDERER,
      PDF_MERGER,
      AUTH_SERVICE, // DocumentsModule's AuthGuard needs it (global AuthModule in prod)
      PLAN_PROVIDER, // DocumentsAiController's PlanGuard needs it (InfraModule in prod)
    ];
    const stubs: Provider[] = leafTokens.map((t) => ({ provide: t, useValue: stub() }));
    @Global()
    @Module({ providers: stubs, exports: leafTokens })
    class StubPortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, StubPortsModule, AiModule],
    }).compile();

    expect(moduleRef.get(DOCUMENT_AI_SERVICE)).toBeDefined();
    expect(moduleRef.get(COVER_LETTER_SERVICE)).toBeDefined();
    expect(moduleRef.get(LLM_FEATURE_RUNNER)).toBeDefined();
    await moduleRef.close();
  });
});
