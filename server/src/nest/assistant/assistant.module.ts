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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { updateAssistantSettingsSchema } from '../../domain/assistant.js';
import { ValidationError } from '../../domain/errors.js';
import { AssistantService } from '../../services/assistant-service.js';
import { AutopilotService } from '../../services/autopilot-service.js';
import { ApplicationBuilder } from '../../services/application-builder.js';
import type { MatchService } from '../../services/match-service.js';
import type { CandidacyService } from '../../services/candidacy-service.js';
import type { MandateService } from '../../services/mandate-service.js';
import type { JobSearchService } from '../../services/job-search-service.js';
import type { DocumentService } from '../../services/document-service.js';
import type { DocumentAiService } from '../../services/document-ai-service.js';
import type { AttachmentService } from '../../services/attachment-service.js';
import type {
  AssistantSettingsStore,
  AssistantSuggestionRepository,
} from '../../ports/assistant-store.js';
import type { MandateRepository } from '../../ports/mandate-repository.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { DocumentRepository } from '../../ports/document-repository.js';
import type { CandidacyRepository } from '../../ports/candidacy-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import type { Logger } from '../../ports/logger.js';
import { AuthGuard } from '../auth.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { PlanGuard, RequiresPlan } from '../plan.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { MatchModule } from '../match/match.module.js';
import { MandatesModule } from '../mandates/mandates.module.js';
import { CandidaciesModule } from '../candidacies/candidacies.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { AttachmentsModule } from '../attachments/attachments.module.js';
import {
  ASSISTANT_SERVICE,
  AUTOPILOT_SERVICE,
  APPLICATION_BUILDER,
  ASSISTANT_SETTINGS_STORE,
  ASSISTANT_SUGGESTION_REPOSITORY,
  MANDATE_REPOSITORY,
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  CANDIDACY_REPOSITORY,
  MATCH_SERVICE,
  CANDIDACY_SERVICE,
  MANDATE_SERVICE,
  JOB_SEARCH_SERVICE,
  DOCUMENT_SERVICE,
  DOCUMENT_AI_SERVICE,
  ATTACHMENT_SERVICE,
  CLOCK,
  ID_GENERATOR,
  LOGGER,
} from '../tokens.js';

/**
 * The assistant's HTTP surface (ADR-0051 port of AssistantController, all
 * authenticated + team-scoped). The deterministic suggest/act modes are Free;
 * only switching to the token-spending autopilot gear (conditional `when` on the
 * settings PUT) and its generated Bewerbungsmappe are Pro.
 */
@Controller('api/v1/assistant')
@UseGuards(AuthGuard, PlanGuard)
export class AssistantController {
  constructor(@Inject(ASSISTANT_SERVICE) private readonly service: AssistantService) {}

  @Get()
  async overview(@CurrentScope() scope: string) {
    const [settings, suggestions] = await Promise.all([
      this.service.getSettings(scope),
      this.service.list(scope),
    ]);
    const counts = { proposed: 0, accepted: 0, dismissed: 0, autoApplied: 0 };
    for (const s of suggestions) {
      if (s.status === 'proposed') counts.proposed += 1;
      else if (s.status === 'accepted') counts.accepted += 1;
      else if (s.status === 'dismissed') counts.dismissed += 1;
      else counts.autoApplied += 1;
    }
    return { settings, counts };
  }

  @Put()
  @RequiresPlan('pro', (req: Request) => (req.body as { mode?: string })?.mode === 'autopilot')
  async updateSettings(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(updateAssistantSettingsSchema))
    input: ReturnType<typeof updateAssistantSettingsSchema.parse>,
  ) {
    return { settings: await this.service.updateSettings(scope, input) };
  }

  @Post('run')
  @HttpCode(200)
  async run(@CurrentScope() scope: string) {
    const settings = await this.service.getSettings(scope);
    if (!settings.enabled) {
      throw new ValidationError('The assistant is switched off — enable it first.');
    }
    return this.service.run(scope);
  }

  @Get('suggestions')
  list(@CurrentScope() scope: string) {
    return this.service.list(scope);
  }

  @Post('suggestions/:id/accept')
  @HttpCode(200)
  async accept(@CurrentScope() scope: string, @Param('id') id: string) {
    return { suggestion: await this.service.accept(scope, id) };
  }

  @Post('suggestions/:id/dismiss')
  @HttpCode(200)
  async dismiss(@CurrentScope() scope: string, @Param('id') id: string) {
    return { suggestion: await this.service.dismiss(scope, id) };
  }

  /** The staged application's Bewerbungsmappe (tailored CV + letter + Zeugnisse). */
  @Get('suggestions/:id/dossier.pdf')
  @UseGuards(AiRateLimitGuard)
  @RequiresPlan('pro')
  async applicationDossier(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.service.renderApplicationDossier(scope, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="bewerbungsmappe.pdf"');
    res.send(pdf);
  }
}

/**
 * Assistant feature slice (ADR-0051): the ApplicationBuilder → AutopilotService →
 * AssistantService chain, composed from the match, mandates, candidacies, jobs,
 * documents and attachments slices.
 */
@Module({
  imports: [
    MatchModule,
    MandatesModule,
    CandidaciesModule,
    JobsModule,
    DocumentsModule,
    AttachmentsModule,
  ],
  controllers: [AssistantController],
  providers: [
    {
      provide: APPLICATION_BUILDER,
      useFactory: (
        documentAiService: DocumentAiService,
        documentService: DocumentService,
        attachmentService: AttachmentService,
      ) => new ApplicationBuilder({ documentAiService, documentService, attachmentService }),
      inject: [DOCUMENT_AI_SERVICE, DOCUMENT_SERVICE, ATTACHMENT_SERVICE],
    },
    {
      provide: AUTOPILOT_SERVICE,
      useFactory: (
        assistantSuggestionRepository: AssistantSuggestionRepository,
        mandateRepository: MandateRepository,
        matchService: MatchService,
        candidacyService: CandidacyService,
        mandateService: MandateService,
        jobSearchService: JobSearchService,
        applicationBuilder: ApplicationBuilder,
        clock: Clock,
        idGenerator: IdGenerator,
        logger: Logger,
      ) =>
        new AutopilotService({
          assistantSuggestionRepository,
          mandateRepository,
          matchService,
          candidacyService,
          mandateService,
          jobSearchService,
          applicationBuilder,
          clock,
          idGenerator,
          logger,
        }),
      inject: [
        ASSISTANT_SUGGESTION_REPOSITORY,
        MANDATE_REPOSITORY,
        MATCH_SERVICE,
        CANDIDACY_SERVICE,
        MANDATE_SERVICE,
        JOB_SEARCH_SERVICE,
        APPLICATION_BUILDER,
        CLOCK,
        ID_GENERATOR,
        LOGGER,
      ],
    },
    {
      provide: ASSISTANT_SERVICE,
      useFactory: (
        assistantSettingsStore: AssistantSettingsStore,
        assistantSuggestionRepository: AssistantSuggestionRepository,
        mandateRepository: MandateRepository,
        talentRepository: TalentRepository,
        documentRepository: DocumentRepository,
        candidacyRepository: CandidacyRepository,
        matchService: MatchService,
        candidacyService: CandidacyService,
        autopilotService: AutopilotService,
        clock: Clock,
        idGenerator: IdGenerator,
        logger: Logger,
      ) =>
        new AssistantService({
          assistantSettingsStore,
          assistantSuggestionRepository,
          mandateRepository,
          talentRepository,
          documentRepository,
          candidacyRepository,
          matchService,
          candidacyService,
          autopilotService,
          clock,
          idGenerator,
          logger,
        }),
      inject: [
        ASSISTANT_SETTINGS_STORE,
        ASSISTANT_SUGGESTION_REPOSITORY,
        MANDATE_REPOSITORY,
        TALENT_REPOSITORY,
        DOCUMENT_REPOSITORY,
        CANDIDACY_REPOSITORY,
        MATCH_SERVICE,
        CANDIDACY_SERVICE,
        AUTOPILOT_SERVICE,
        CLOCK,
        ID_GENERATOR,
        LOGGER,
      ],
    },
  ],
  exports: [ASSISTANT_SERVICE, AUTOPILOT_SERVICE],
})
export class AssistantModule {}
