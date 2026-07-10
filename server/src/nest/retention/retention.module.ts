import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { updateRetentionPolicySchema } from '../../domain/retention.js';
import { RetentionService } from '../../services/retention-service.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { CandidacyRepository } from '../../ports/candidacy-repository.js';
import type { TalentDataPurger } from '../../ports/talent-data.js';
import type { RetentionPolicyStore } from '../../ports/retention-policy-store.js';
import type { Clock } from '../../ports/clock.js';
import type { Logger } from '../../ports/logger.js';
import { AuthGuard } from '../auth.guard.js';
import { Can, RolesGuard } from '../authorization.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  RETENTION_SERVICE,
  TALENT_REPOSITORY,
  CANDIDACY_REPOSITORY,
  TALENT_DATA_PURGERS,
  RETENTION_POLICY_STORE,
  CLOCK,
  LOGGER,
} from '../tokens.js';

/**
 * DSGVO retention (ADR-0051 port of RetentionController): review report, the
 * team's policy and the anonymize actions. Admin-only, enforced declaratively at
 * the route via `@Can('retention', …)` — the Nest translation of `requireCan`.
 */
@Controller('api/v1')
@UseGuards(AuthGuard, RolesGuard)
export class RetentionController {
  constructor(@Inject(RETENTION_SERVICE) private readonly service: RetentionService) {}

  @Get('retention/report')
  @Can('retention', 'read')
  report(@CurrentScope() scope: string, @Query('days') daysRaw?: string) {
    const days = Number.parseInt(String(daysRaw ?? ''), 10);
    const reviewDays = Number.isFinite(days) && days >= 0 ? days : undefined;
    return this.service.report(scope, reviewDays);
  }

  @Get('retention/policy')
  @Can('retention', 'read')
  getPolicy(@CurrentScope() scope: string) {
    return this.service.getPolicy(scope);
  }

  @Put('retention/policy')
  @Can('retention', 'anonymize')
  updatePolicy(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(updateRetentionPolicySchema))
    patch: ReturnType<typeof updateRetentionPolicySchema.parse>,
  ) {
    return this.service.updatePolicy(scope, patch);
  }

  @Post('retention/anonymize-overdue')
  @HttpCode(200)
  @Can('retention', 'anonymize')
  anonymizeOverdue(@CurrentScope() scope: string) {
    return this.service.anonymizeOverdue(scope);
  }

  @Post('talents/:id/anonymize')
  @HttpCode(200)
  @Can('retention', 'anonymize')
  async anonymize(@CurrentScope() scope: string, @Param('id') id: string) {
    return { talent: await this.service.anonymize(scope, id) };
  }
}

/** Retention feature slice (ADR-0051): RetentionService wired via useFactory. */
@Module({
  controllers: [RetentionController],
  providers: [
    RolesGuard,
    {
      provide: RETENTION_SERVICE,
      useFactory: (
        talentRepository: TalentRepository,
        candidacyRepository: CandidacyRepository,
        talentDataPurgers: TalentDataPurger[],
        retentionPolicyStore: RetentionPolicyStore,
        clock: Clock,
        logger: Logger,
      ) =>
        new RetentionService({
          talentRepository,
          candidacyRepository,
          talentDataPurgers,
          retentionPolicyStore,
          clock,
          logger,
        }),
      inject: [
        TALENT_REPOSITORY,
        CANDIDACY_REPOSITORY,
        TALENT_DATA_PURGERS,
        RETENTION_POLICY_STORE,
        CLOCK,
        LOGGER,
      ],
    },
  ],
  exports: [RETENTION_SERVICE],
})
export class RetentionModule {}
