import { Global, Module } from '@nestjs/common';
import type { AppConfig } from '../config.js';
import type { Logger } from '../ports/logger.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import { BetterAuthEngine } from '../adapters/better-auth/better-auth-engine.js';
import { RoleAuthorizer } from '../adapters/role-authorizer.js';
import { createMailer } from '../adapters/mailer-factory.js';
import { createInboxSource } from '../adapters/inbox-source-factory.js';
import { createPdfArchive } from '../adapters/create-pdf-archive.js';
import { GitVersioner } from '../adapters/git-versioner.js';
import { NoopVersioner } from '../adapters/noop-versioner.js';
import { PuppeteerPdfRenderer } from '../adapters/puppeteer-pdf-renderer.js';
import { PdfLibMerger } from '../adapters/pdf-lib-merger.js';
import { PdfjsTextExtractor } from '../adapters/pdfjs-text-extractor.js';
import { EnvPlanProvider } from '../adapters/env-plan-provider.js';
import { createEmbeddingProvider } from '../adapters/create-embedding-provider.js';
import { AnthropicLlmProvider } from '../adapters/anthropic-llm-provider.js';
import { GeminiLlmProvider } from '../adapters/gemini-llm-provider.js';
import { LlmService } from '../services/llm-service.js';
import {
  CONFIG,
  LOGGER,
  HTTP_FETCH,
  AUTH_ENGINE,
  AUTHORIZER,
  MAILER,
  INBOX_SOURCE,
  PDF_ARCHIVE,
  VERSIONER,
  PDF_RENDERER,
  PDF_MERGER,
  PDF_TEXT_EXTRACTOR,
  PLAN_PROVIDER,
  EMBEDDING_PROVIDER,
  LLM_SERVICE,
} from './tokens.js';

/**
 * Infrastructure singletons (ADR-0051) — the side-effecting adapters and
 * factory-selected providers from `container.ts`, translated to Nest providers.
 * All are `useFactory` so the hexagonal classes keep their `constructor(deps)`
 * shape. Auth credentials + sessions live in the Better-Auth engine (ADR-0043);
 * the store switch chooses the git vs noop versioner exactly as before.
 */
@Global()
@Module({
  providers: [
    {
      provide: AUTH_ENGINE,
      useFactory: (config: AppConfig) =>
        BetterAuthEngine.create({
          dbPath: config.auth.betterAuthDbPath,
          secret: config.security.encryptionSecret,
        }),
      inject: [CONFIG],
    },
    { provide: AUTHORIZER, useFactory: () => new RoleAuthorizer() },
    {
      provide: MAILER,
      useFactory: (config: AppConfig, logger: Logger) => createMailer({ config, logger }),
      inject: [CONFIG, LOGGER],
    },
    {
      provide: INBOX_SOURCE,
      useFactory: (config: AppConfig) => createInboxSource({ config }),
      inject: [CONFIG],
    },
    {
      provide: PDF_ARCHIVE,
      useFactory: (config: AppConfig) => createPdfArchive({ config }),
      inject: [CONFIG],
    },
    {
      // Git versioning only makes sense for the file store; Postgres has no JSON
      // files to commit, so it gets the no-op versioner.
      provide: VERSIONER,
      useFactory: (config: AppConfig, logger: Logger) =>
        config.store === 'sql' ? new NoopVersioner() : new GitVersioner({ config, logger }),
      inject: [CONFIG, LOGGER],
    },
    {
      provide: PDF_RENDERER,
      useFactory: (config: AppConfig, logger: Logger) =>
        new PuppeteerPdfRenderer({ config, logger }),
      inject: [CONFIG, LOGGER],
    },
    { provide: PDF_MERGER, useFactory: () => new PdfLibMerger() },
    { provide: PDF_TEXT_EXTRACTOR, useFactory: () => new PdfjsTextExtractor() },
    {
      provide: PLAN_PROVIDER,
      useFactory: (config: AppConfig) => new EnvPlanProvider(config.plan),
      inject: [CONFIG],
    },
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (config: AppConfig, logger: Logger, httpFetch: HttpFetch) =>
        createEmbeddingProvider({ config: config.embedding, logger, httpFetch }),
      inject: [CONFIG, LOGGER, HTTP_FETCH],
    },
    {
      provide: LLM_SERVICE,
      useFactory: (config: AppConfig, logger: Logger, httpFetch: HttpFetch) =>
        new LlmService({
          providers: [
            new AnthropicLlmProvider({ httpFetch, config: config.llm.anthropic }),
            new GeminiLlmProvider({ httpFetch, config: config.llm.gemini }),
          ],
          defaultProvider: config.llm.provider,
          logger,
        }),
      inject: [CONFIG, LOGGER, HTTP_FETCH],
    },
  ],
  exports: [
    AUTH_ENGINE,
    AUTHORIZER,
    MAILER,
    INBOX_SOURCE,
    PDF_ARCHIVE,
    VERSIONER,
    PDF_RENDERER,
    PDF_MERGER,
    PDF_TEXT_EXTRACTOR,
    PLAN_PROVIDER,
    EMBEDDING_PROVIDER,
    LLM_SERVICE,
  ],
})
export class InfraModule {}
