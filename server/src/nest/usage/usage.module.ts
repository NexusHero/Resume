import { Controller, Get, Header, Inject, Module, UseGuards } from '@nestjs/common';
import { UsageService } from '../../services/usage-service.js';
import type { UsageMeter } from '../../ports/usage-meter.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentUserId } from '../params.js';
import { USAGE_SERVICE, USAGE_METER } from '../tokens.js';

/**
 * Per-user AI usage + audit trail under /api/v1/settings/usage (ADR-0051 port of
 * UsageController). Keyed by the signed-in user, not the team scope.
 */
@Controller('api/v1/settings/usage')
@UseGuards(AuthGuard)
export class UsageController {
  constructor(@Inject(USAGE_SERVICE) private readonly service: UsageService) {}

  @Get()
  summary(@CurrentUserId() userId: string) {
    return this.service.summaryFor(userId);
  }

  @Get('audit')
  audit(@CurrentUserId() userId: string) {
    return this.service.auditFor(userId);
  }

  @Get('audit.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="ai-audit-trail.csv"')
  auditCsv(@CurrentUserId() userId: string) {
    return this.service.auditCsvFor(userId);
  }
}

@Module({
  controllers: [UsageController],
  providers: [
    {
      provide: USAGE_SERVICE,
      useFactory: (usageMeter: UsageMeter) => new UsageService({ usageMeter }),
      inject: [USAGE_METER],
    },
  ],
})
export class UsageModule {}
