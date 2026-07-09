import { Module } from '@nestjs/common';
import { MandateService } from '../../services/mandate-service.js';
import type { MandateRepository } from '../../ports/mandate-repository.js';
import type { CandidacyRepository } from '../../ports/candidacy-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { MandatesController } from './mandates.controller.js';
import {
  MANDATE_SERVICE,
  MANDATE_REPOSITORY,
  CANDIDACY_REPOSITORY,
  CLOCK,
  ID_GENERATOR,
} from '../tokens.js';

/** Mandates feature slice (ADR-0051): MandateService wired via useFactory. */
@Module({
  controllers: [MandatesController],
  providers: [
    {
      provide: MANDATE_SERVICE,
      useFactory: (
        mandateRepository: MandateRepository,
        candidacyRepository: CandidacyRepository,
        clock: Clock,
        idGenerator: IdGenerator,
      ) => new MandateService({ mandateRepository, candidacyRepository, clock, idGenerator }),
      inject: [MANDATE_REPOSITORY, CANDIDACY_REPOSITORY, CLOCK, ID_GENERATOR],
    },
  ],
})
export class MandatesModule {}
