import { Module } from '@nestjs/common';
import { JobSearchService } from '../../services/job-search-service.js';
import { createJobSource } from '../../adapters/job-source-factory.js';
import type { JobSource } from '../../ports/job-source.js';
import type { SkillExtractor } from '../../ports/skill-extractor.js';
import type { CandidateProfile } from '../../domain/skill.js';
import type { HttpFetch } from '../../ports/http-fetch.js';
import type { Logger } from '../../ports/logger.js';
import type { AppConfig } from '../../config.js';
import {
  CONFIG,
  LOGGER,
  HTTP_FETCH,
  CANDIDATE_PROFILE,
  JOB_SOURCE,
  SKILL_EXTRACTOR,
  JOB_SEARCH_SERVICE,
} from '../tokens.js';
import { JobsController } from './jobs.controller.js';

/**
 * The jobs feature slice (ADR-0051) — the reference vertical proving the whole
 * pattern: a Nest controller + guard + zod pipe + problem filter, with the
 * hexagonal services wired via `useFactory` so their `constructor(deps:{…})`
 * shape is preserved and no Nest decorator touches the domain. Every other
 * controller follows this same shape.
 */
@Module({
  controllers: [JobsController],
  providers: [
    {
      provide: JOB_SOURCE,
      useFactory: (config: AppConfig, logger: Logger, httpFetch: HttpFetch): JobSource =>
        createJobSource({ config, logger, httpFetch }),
      inject: [CONFIG, LOGGER, HTTP_FETCH],
    },
    {
      provide: JOB_SEARCH_SERVICE,
      useFactory: (
        jobSource: JobSource,
        skillExtractor: SkillExtractor,
        candidateProfile: CandidateProfile,
        logger: Logger,
      ) => new JobSearchService({ jobSource, skillExtractor, candidateProfile, logger }),
      inject: [JOB_SOURCE, SKILL_EXTRACTOR, CANDIDATE_PROFILE, LOGGER],
    },
  ],
})
export class JobsModule {}
