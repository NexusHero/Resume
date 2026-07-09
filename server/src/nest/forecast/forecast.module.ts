import { Controller, Get, Inject, Module, UseGuards } from '@nestjs/common';
import { ForecastService } from '../../services/forecast-service.js';
import type { MandateRepository } from '../../ports/mandate-repository.js';
import type { CandidacyRepository } from '../../ports/candidacy-repository.js';
import type { StageTransitionRepository } from '../../ports/stage-transition-repository.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import {
  FORECAST_SERVICE,
  MANDATE_REPOSITORY,
  CANDIDACY_REPOSITORY,
  STAGE_TRANSITION_REPOSITORY,
} from '../tokens.js';

/** Revenue forecast under /api/v1/forecast (ADR-0051 port of ForecastController). */
@Controller('api/v1/forecast')
@UseGuards(AuthGuard)
export class ForecastController {
  constructor(@Inject(FORECAST_SERVICE) private readonly service: ForecastService) {}

  @Get()
  get(@CurrentScope() scope: string) {
    return this.service.forecast(scope);
  }
}

@Module({
  controllers: [ForecastController],
  providers: [
    {
      provide: FORECAST_SERVICE,
      useFactory: (
        mandateRepository: MandateRepository,
        candidacyRepository: CandidacyRepository,
        stageTransitionRepository: StageTransitionRepository,
      ) =>
        new ForecastService({ mandateRepository, candidacyRepository, stageTransitionRepository }),
      inject: [MANDATE_REPOSITORY, CANDIDACY_REPOSITORY, STAGE_TRANSITION_REPOSITORY],
    },
  ],
})
export class ForecastModule {}
