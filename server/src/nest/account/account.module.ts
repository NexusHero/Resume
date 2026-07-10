import { Controller, Delete, Get, HttpCode, Inject, Module, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AccountService } from '../../services/account-service.js';
import type { UserErasureStep, UserExportSection } from '../../ports/personal-data.js';
import type { UserRepository } from '../../ports/user-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { AppConfig } from '../../config.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import {
  ACCOUNT_SERVICE,
  USER_REPOSITORY,
  USER_ERASURE_STEPS,
  USER_EXPORT_SECTIONS,
  CLOCK,
  CONFIG,
} from '../tokens.js';

/**
 * DSGVO account endpoints under /api/v1/account (ADR-0051 port of
 * AccountController): export everything the signed-in recruiter owns, and erase
 * the account entirely (clearing the session cookie on the way out).
 */
@Controller('api/v1/account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(
    @Inject(ACCOUNT_SERVICE) private readonly service: AccountService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('export')
  async export(
    @CurrentUserId() userId: string,
    @CurrentScope() scope: string,
    @Res() res: Response,
  ) {
    const data = await this.service.exportFor(userId, scope, this.clock.isoNow());
    // Offer it as a download — a portable JSON file the recruiter can keep.
    res.setHeader('Content-Disposition', 'attachment; filename="myjob-export.json"');
    res.json(data);
  }

  @Delete()
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string, @Res() res: Response): Promise<void> {
    await this.service.erase(userId);
    res.clearCookie(this.config.auth.sessionCookieName, { path: '/' });
    res.sendStatus(204);
  }
}

/** Account feature slice (ADR-0051): AccountService over the DSGVO registries. */
@Module({
  controllers: [AccountController],
  providers: [
    {
      provide: ACCOUNT_SERVICE,
      useFactory: (
        userRepository: UserRepository,
        userErasureSteps: UserErasureStep[],
        userExportSections: UserExportSection[],
      ) => new AccountService({ userRepository, userErasureSteps, userExportSections }),
      inject: [USER_REPOSITORY, USER_ERASURE_STEPS, USER_EXPORT_SECTIONS],
    },
  ],
  exports: [ACCOUNT_SERVICE],
})
export class AccountModule {}
