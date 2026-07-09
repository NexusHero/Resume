import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Module,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createInviteSchema, acceptInviteSchema } from '../../domain/tenant-invite.js';
import { InviteService } from '../../services/invite-service.js';
import type { InviteRepository } from '../../ports/invite-repository.js';
import type { UserRepository } from '../../ports/user-repository.js';
import type { AuthEngine } from '../../ports/auth-engine.js';
import type { Mailer } from '../../ports/mailer.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import type { Logger } from '../../ports/logger.js';
import type { AppConfig } from '../../config.js';
import { AuthGuard } from '../auth.guard.js';
import { Can, RolesGuard } from '../authorization.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  INVITE_SERVICE,
  INVITE_REPOSITORY,
  USER_REPOSITORY,
  AUTH_ENGINE,
  MAILER,
  CLOCK,
  ID_GENERATOR,
  LOGGER,
  CONFIG,
} from '../tokens.js';

/**
 * Tenant invitations (ADR-0051 port of InviteController): admin-gated create/list
 * under /api/v1/members/invites, and the public `POST /api/v1/auth/accept-invite`
 * that sets a session cookie on the passthrough response, like register.
 */
@Controller('api/v1')
export class InvitesController {
  private readonly cookieName: string;
  private readonly cookieSecure: boolean;
  private readonly maxAgeMs: number;

  constructor(
    @Inject(INVITE_SERVICE) private readonly service: InviteService,
    @Inject(CONFIG) config: AppConfig,
  ) {
    this.cookieName = config.auth.sessionCookieName;
    this.cookieSecure = config.auth.cookieSecure;
    this.maxAgeMs = config.auth.sessionTtlMs;
  }

  @Post('members/invites')
  @HttpCode(201)
  @UseGuards(AuthGuard, RolesGuard)
  @Can('member', 'invite')
  create(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createInviteSchema))
    input: ReturnType<typeof createInviteSchema.parse>,
  ) {
    return this.service.create(scope, userId, input);
  }

  @Get('members/invites')
  @UseGuards(AuthGuard, RolesGuard)
  @Can('member', 'listInvites')
  list(@CurrentScope() scope: string) {
    return this.service.list(scope);
  }

  @Post('auth/accept-invite')
  @HttpCode(201)
  async accept(
    @Body(new ZodValidationPipe(acceptInviteSchema))
    input: ReturnType<typeof acceptInviteSchema.parse>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.service.accept(input);
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: this.maxAgeMs,
    });
    return { user };
  }
}

@Module({
  controllers: [InvitesController],
  providers: [
    RolesGuard,
    {
      provide: INVITE_SERVICE,
      useFactory: (
        inviteRepository: InviteRepository,
        userRepository: UserRepository,
        authEngine: AuthEngine,
        idGenerator: IdGenerator,
        clock: Clock,
        mailer: Mailer,
        logger: Logger,
        config: AppConfig,
      ) =>
        new InviteService({
          inviteRepository,
          userRepository,
          authEngine,
          idGenerator,
          clock,
          mailer,
          logger,
          config,
        }),
      inject: [
        INVITE_REPOSITORY,
        USER_REPOSITORY,
        AUTH_ENGINE,
        ID_GENERATOR,
        CLOCK,
        MAILER,
        LOGGER,
        CONFIG,
      ],
    },
  ],
})
export class InvitesModule {}
