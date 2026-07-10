import { Controller, HttpCode, Inject, Module, Param, Post, UseGuards } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors.js';
import type { MandateRepository } from '../../ports/mandate-repository.js';
import type { DocumentAiService } from '../../services/document-ai-service.js';
import { AuthGuard } from '../auth.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { PlanGuard, RequiresPlan } from '../plan.guard.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { MANDATE_REPOSITORY, DOCUMENT_AI_SERVICE } from '../tokens.js';

/**
 * AI on top of matching (ADR-0051 port of MatchAiController): explain why a
 * candidate fits a mandate, generate an interview kit and candidate prep.
 * All three are generative (Pro + AI rate limit); documents belong to the team
 * scope while the caller's own user id selects their personal LLM key.
 */
@Controller('api/v1/mandates/:id/candidates/:talentId')
@UseGuards(AuthGuard, AiRateLimitGuard, PlanGuard)
@RequiresPlan('pro')
export class MatchAiController {
  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(DOCUMENT_AI_SERVICE) private readonly ai: DocumentAiService,
  ) {}

  private async mandateOr404(scope: string, id: string) {
    const mandate = await this.mandates.findById(scope, id);
    if (!mandate) throw new NotFoundError(`Mandate ${id} not found`);
    return mandate;
  }

  @Post('explain')
  @HttpCode(200)
  async explain(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('talentId') talentId: string,
  ) {
    const mandate = await this.mandateOr404(scope, id);
    const explanation = await this.ai.explainMatch(scope, userId, talentId, {
      role: mandate.role,
      location: mandate.location,
      client: mandate.client,
    });
    return { explanation };
  }

  @Post('interview-kit')
  @HttpCode(200)
  async interviewKit(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('talentId') talentId: string,
  ) {
    const mandate = await this.mandateOr404(scope, id);
    const kit = await this.ai.interviewKit(scope, userId, talentId, {
      role: mandate.role,
      location: mandate.location,
      client: mandate.client,
    });
    return { kit };
  }

  @Post('prep')
  @HttpCode(200)
  async prep(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('talentId') talentId: string,
  ) {
    const mandate = await this.mandateOr404(scope, id);
    const prep = await this.ai.candidatePrep(
      scope,
      userId,
      talentId,
      { role: mandate.role, location: mandate.location, client: mandate.client },
      mandate.jobText,
    );
    return { prep };
  }
}

@Module({ controllers: [MatchAiController] })
export class MatchAiModule {}
