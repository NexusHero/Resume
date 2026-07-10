import { Body, Controller, HttpCode, Module, Post, UseGuards } from '@nestjs/common';
import { aggCheckSchema, checkAgg, rewriteAgg } from '../../domain/agg-check.js';
import { AuthGuard } from '../auth.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { PlanGuard, RequiresPlan } from '../plan.guard.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';

/**
 * AGG (anti-discrimination) compliance tooling under /api/v1/compliance
 * (ADR-0051 port of ComplianceController). The check itself is deterministic
 * (Free); only the LLM-generated neutral rewrite is Pro + rate-limited.
 */
@Controller('api/v1/compliance')
@UseGuards(AuthGuard, PlanGuard)
export class ComplianceController {
  @Post('agg-check')
  @HttpCode(200)
  aggCheck(@Body(new ZodValidationPipe(aggCheckSchema)) body: { text: string }) {
    return checkAgg(body.text);
  }

  @Post('agg-rewrite')
  @HttpCode(200)
  @UseGuards(AiRateLimitGuard)
  @RequiresPlan('pro')
  aggRewrite(@Body(new ZodValidationPipe(aggCheckSchema)) body: { text: string }) {
    return rewriteAgg(body.text);
  }
}

@Module({ controllers: [ComplianceController] })
export class ComplianceModule {}
