import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { setOutcomeSchema, summarizeArtifacts } from '../../domain/artifact.js';
import { NotFoundError } from '../../domain/errors.js';
import type { ArtifactLogRepository } from '../../ports/artifact-log-repository.js';
import type { Clock } from '../../ports/clock.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { ARTIFACT_LOG_REPOSITORY, CLOCK } from '../tokens.js';

/**
 * The outcome loop's HTTP surface (ADR-0051 port of ArtifactController,
 * authenticated + team-scoped): generated artifacts newest first, reply-rate
 * stats, and stamping what became of an outreach.
 */
@Controller('api/v1/artifacts')
@UseGuards(AuthGuard)
export class ArtifactsController {
  constructor(
    @Inject(ARTIFACT_LOG_REPOSITORY) private readonly artifacts: ArtifactLogRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get()
  async list(@CurrentScope() scope: string, @Query('talentId') talentId?: string) {
    return talentId ? this.artifacts.listForTalent(scope, talentId) : this.artifacts.list(scope);
  }

  @Get('stats')
  async stats(@CurrentScope() scope: string) {
    return summarizeArtifacts(await this.artifacts.list(scope));
  }

  @Post(':id/outcome')
  @HttpCode(200)
  async setOutcome(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setOutcomeSchema)) body: { outcome: string },
  ) {
    const log = await this.artifacts.findById(scope, id);
    if (!log) throw new NotFoundError(`Artifact ${id} not found`);
    const updated = {
      ...log,
      outcome: body.outcome as typeof log.outcome,
      outcomeAt: this.clock.isoNow(),
    };
    await this.artifacts.update(updated);
    return { artifact: updated };
  }
}

@Module({ controllers: [ArtifactsController] })
export class ArtifactsModule {}
