import { Body, Controller, HttpCode, Inject, Module, Post, UseGuards } from '@nestjs/common';
import { requestResetSchema, confirmResetSchema } from '../../domain/password-reset.js';
import { PasswordResetService } from '../../services/password-reset-service.js';
import type { UserRepository } from '../../ports/user-repository.js';
import type { AuthEngine } from '../../ports/auth-engine.js';
import type { PasswordResetTokenStore } from '../../ports/password-reset-token-store.js';
import type { Mailer } from '../../ports/mailer.js';
import type { Logger } from '../../ports/logger.js';
import type { AppConfig } from '../../config.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { AuthRateLimitGuard } from '../auth-rate-limit.guard.js';
import {
  PASSWORD_RESET_SERVICE,
  USER_REPOSITORY,
  AUTH_ENGINE,
  PASSWORD_RESET_TOKEN_STORE,
  MAILER,
  LOGGER,
  CONFIG,
} from '../tokens.js';

/**
 * Password reset under /api/v1/auth/password-reset (ADR-0051 port). Public routes:
 * request always 202 (never leaks whether the email exists), confirm 204.
 */
@Controller('api/v1/auth/password-reset')
export class PasswordResetController {
  constructor(@Inject(PASSWORD_RESET_SERVICE) private readonly service: PasswordResetService) {}

  @Post('request')
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(202)
  async request(
    @Body(new ZodValidationPipe(requestResetSchema))
    body: ReturnType<typeof requestResetSchema.parse>,
  ) {
    await this.service.request(body.email);
    return { ok: true };
  }

  @Post('confirm')
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(204)
  async confirm(
    @Body(new ZodValidationPipe(confirmResetSchema))
    body: ReturnType<typeof confirmResetSchema.parse>,
  ): Promise<void> {
    await this.service.confirm(body.token, body.password);
  }
}

@Module({
  controllers: [PasswordResetController],
  providers: [
    {
      provide: PASSWORD_RESET_SERVICE,
      useFactory: (
        userRepository: UserRepository,
        authEngine: AuthEngine,
        passwordResetTokenStore: PasswordResetTokenStore,
        mailer: Mailer,
        logger: Logger,
        config: AppConfig,
      ) =>
        new PasswordResetService({
          userRepository,
          authEngine,
          passwordResetTokenStore,
          mailer,
          logger,
          config,
        }),
      inject: [USER_REPOSITORY, AUTH_ENGINE, PASSWORD_RESET_TOKEN_STORE, MAILER, LOGGER, CONFIG],
    },
  ],
})
export class PasswordResetModule {}
