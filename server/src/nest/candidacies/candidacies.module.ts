import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { addCandidacySchema, updateCandidacySchema } from '../../domain/candidacy.js';
import { CandidacyService } from '../../services/candidacy-service.js';
import type { PlacementService } from '../../services/placement-service.js';
import type { CandidacyRepository } from '../../ports/candidacy-repository.js';
import type { MandateRepository } from '../../ports/mandate-repository.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { StageTransitionRepository } from '../../ports/stage-transition-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import type { Logger } from '../../ports/logger.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { PlacementsModule } from '../placements/placements.module.js';
import {
  CANDIDACY_SERVICE,
  PLACEMENT_SERVICE,
  CANDIDACY_REPOSITORY,
  MANDATE_REPOSITORY,
  TALENT_REPOSITORY,
  STAGE_TRANSITION_REPOSITORY,
  CLOCK,
  ID_GENERATOR,
  LOGGER,
} from '../tokens.js';

/**
 * Candidacies (pipeline) under /api/v1 (ADR-0051 port of CandidacyController):
 * a mandate's board, adding a talent, a talent's candidacies, and stage
 * update/removal. Team-scoped via @CurrentScope.
 */
@Controller('api/v1')
@UseGuards(AuthGuard)
export class CandidaciesController {
  constructor(@Inject(CANDIDACY_SERVICE) private readonly service: CandidacyService) {}

  @Get('mandates/:id/candidacies')
  board(@CurrentScope() scope: string, @Param('id') mandateId: string) {
    return this.service.board(scope, mandateId);
  }

  @Post('mandates/:id/candidacies')
  @HttpCode(201)
  async add(
    @CurrentScope() scope: string,
    @Param('id') mandateId: string,
    @Body(new ZodValidationPipe(addCandidacySchema))
    input: ReturnType<typeof addCandidacySchema.parse>,
  ) {
    return { candidacy: await this.service.add(scope, mandateId, input) };
  }

  @Get('talents/:id/candidacies')
  forTalent(@CurrentScope() scope: string, @Param('id') talentId: string) {
    return this.service.forTalent(scope, talentId);
  }

  @Patch('candidacies/:id')
  async update(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCandidacySchema))
    patch: ReturnType<typeof updateCandidacySchema.parse>,
  ) {
    return { candidacy: await this.service.update(scope, id, patch) };
  }

  @Delete('candidacies/:id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string): Promise<void> {
    await this.service.remove(scope, id);
  }
}

/** Candidacies feature slice (ADR-0051): CandidacyService wired via useFactory. */
@Module({
  imports: [PlacementsModule], // provides PLACEMENT_SERVICE (a candidacy → placement)
  controllers: [CandidaciesController],
  providers: [
    {
      provide: CANDIDACY_SERVICE,
      useFactory: (
        candidacyRepository: CandidacyRepository,
        mandateRepository: MandateRepository,
        talentRepository: TalentRepository,
        placementService: PlacementService,
        stageTransitionRepository: StageTransitionRepository,
        clock: Clock,
        idGenerator: IdGenerator,
        logger: Logger,
      ) =>
        new CandidacyService({
          candidacyRepository,
          mandateRepository,
          talentRepository,
          placementService,
          stageTransitionRepository,
          clock,
          idGenerator,
          logger,
        }),
      inject: [
        CANDIDACY_REPOSITORY,
        MANDATE_REPOSITORY,
        TALENT_REPOSITORY,
        PLACEMENT_SERVICE,
        STAGE_TRANSITION_REPOSITORY,
        CLOCK,
        ID_GENERATOR,
        LOGGER,
      ],
    },
  ],
  exports: [CANDIDACY_SERVICE],
})
export class CandidaciesModule {}
