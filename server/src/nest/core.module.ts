import { Global, Module } from '@nestjs/common';
import { loadConfig, type AppConfig } from '../config.js';
import { createLogger } from '../adapters/pino-logger.js';
import { nodeFetch } from '../adapters/node-fetch.js';
import { SystemClock } from '../adapters/system-clock.js';
import { RandomIdGenerator } from '../adapters/random-id-generator.js';
import { CONFIG, LOGGER, CANDIDATE_PROFILE, HTTP_FETCH, CLOCK, ID_GENERATOR } from './tokens.js';

/**
 * Global composition providers (ADR-0051) — the framework-agnostic singletons
 * every feature module shares. This is the NestJS translation of the top of
 * `container.ts`: config, logger, the candidate profile and the HTTP fetch.
 * Persistence (repositories, stores) and the services are added here as the
 * migration proceeds. Everything is wired with `useValue`/`useFactory` so the
 * hexagonal classes stay free of Nest decorators — the framework lives at the
 * edge only.
 */
@Global()
@Module({
  providers: [
    { provide: CONFIG, useFactory: (): AppConfig => loadConfig() },
    { provide: LOGGER, useFactory: () => createLogger() },
    {
      provide: CANDIDATE_PROFILE,
      useFactory: (config: AppConfig) => config.candidateProfile,
      inject: [CONFIG],
    },
    { provide: HTTP_FETCH, useValue: nodeFetch },
    { provide: CLOCK, useFactory: () => new SystemClock() },
    { provide: ID_GENERATOR, useFactory: () => new RandomIdGenerator() },
  ],
  exports: [CONFIG, LOGGER, CANDIDATE_PROFILE, HTTP_FETCH, CLOCK, ID_GENERATOR],
})
export class CoreModule {}
