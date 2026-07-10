import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { sendOutreachSchema } from '../../domain/mail-sync.js';
import { MailService } from '../../services/mail-service.js';
import type { AppConfig } from '../../config.js';
import type { Mailer } from '../../ports/mailer.js';
import type { InboxSource } from '../../ports/inbox-source.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { ArtifactLogRepository } from '../../ports/artifact-log-repository.js';
import type { Logger } from '../../ports/logger.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  MAIL_SERVICE,
  CONFIG,
  MAILER,
  INBOX_SOURCE,
  TALENT_REPOSITORY,
  ARTIFACT_LOG_REPOSITORY,
  LOGGER,
} from '../tokens.js';

/**
 * The email integration's HTTP surface (ADR-0015/0051 port of MailController,
 * authenticated + team-scoped): send a drafted outreach email, trigger one
 * reply-detection pass on demand, and report the transport configuration.
 */
@Controller('api/v1')
@UseGuards(AuthGuard)
export class MailController {
  constructor(@Inject(MAIL_SERVICE) private readonly mailService: MailService) {}

  @Post('talents/:id/outreach/send')
  @HttpCode(200)
  async sendOutreach(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendOutreachSchema))
    input: ReturnType<typeof sendOutreachSchema.parse>,
  ) {
    return this.mailService.sendOutreach(scope, id, input);
  }

  @Post('mail/sync-replies')
  @HttpCode(200)
  async syncReplies(@CurrentScope() scope: string) {
    return this.mailService.syncReplies(scope);
  }

  @Get('mail/status')
  status() {
    return this.mailService.status();
  }
}

/** Mail feature slice (ADR-0051): MailService wired via useFactory. */
@Module({
  controllers: [MailController],
  providers: [
    {
      provide: MAIL_SERVICE,
      useFactory: (
        config: AppConfig,
        mailer: Mailer,
        inboxSource: InboxSource,
        talentRepository: TalentRepository,
        artifactLogRepository: ArtifactLogRepository,
        logger: Logger,
      ) =>
        new MailService({
          config,
          mailer,
          inboxSource,
          talentRepository,
          artifactLogRepository,
          logger,
        }),
      inject: [CONFIG, MAILER, INBOX_SOURCE, TALENT_REPOSITORY, ARTIFACT_LOG_REPOSITORY, LOGGER],
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
