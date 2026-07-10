import { Global, Module } from '@nestjs/common';
import { AuthService } from '../../services/auth-service.js';
import { EmailVerificationService } from '../../services/email-verification-service.js';
import type { UserRepository } from '../../ports/user-repository.js';
import type { AuthEngine } from '../../ports/auth-engine.js';
import type { TenantRepository } from '../../ports/tenant-repository.js';
import type { EmailVerificationTokenStore } from '../../ports/email-verification-token-store.js';
import type { Mailer } from '../../ports/mailer.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import type { Logger } from '../../ports/logger.js';
import type { AppConfig } from '../../config.js';
import { AuthGuard, OptionalAuthGuard } from '../auth.guard.js';
import { AuthController } from './auth.controller.js';
import {
  AUTH_SERVICE,
  EMAIL_VERIFICATION_SERVICE,
  USER_REPOSITORY,
  AUTH_ENGINE,
  TENANT_REPOSITORY,
  EMAIL_VERIFICATION_TOKEN_STORE,
  MAILER,
  CLOCK,
  ID_GENERATOR,
  LOGGER,
  CONFIG,
} from '../tokens.js';

/**
 * Authentication slice (ADR-0051): the AuthService + EmailVerificationService and
 * the guards that replace the Express `requireAuth`/`attachUser` middleware. It is
 * `@Global` and exports the guards + AuthService so every other feature module can
 * apply `@UseGuards(AuthGuard)` without re-importing. Ports come from the global
 * Persistence/Infra/Core modules; the services keep their `constructor(deps)` shape.
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_SERVICE,
      useFactory: (
        userRepository: UserRepository,
        authEngine: AuthEngine,
        clock: Clock,
        idGenerator: IdGenerator,
        tenantRepository: TenantRepository,
        config: AppConfig,
      ) =>
        new AuthService({
          userRepository,
          authEngine,
          clock,
          idGenerator,
          tenantRepository,
          config,
        }),
      inject: [USER_REPOSITORY, AUTH_ENGINE, CLOCK, ID_GENERATOR, TENANT_REPOSITORY, CONFIG],
    },
    {
      provide: EMAIL_VERIFICATION_SERVICE,
      useFactory: (
        userRepository: UserRepository,
        emailVerificationTokenStore: EmailVerificationTokenStore,
        mailer: Mailer,
        logger: Logger,
        clock: Clock,
        config: AppConfig,
      ) =>
        new EmailVerificationService({
          userRepository,
          emailVerificationTokenStore,
          mailer,
          logger,
          clock,
          config,
        }),
      inject: [USER_REPOSITORY, EMAIL_VERIFICATION_TOKEN_STORE, MAILER, LOGGER, CLOCK, CONFIG],
    },
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [AUTH_SERVICE, EMAIL_VERIFICATION_SERVICE, AuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
