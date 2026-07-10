import { Body, Controller, HttpCode, Inject, Module, Param, Post, UseGuards } from '@nestjs/common';
import { matchRequestSchema } from '../../domain/match.js';
import { MatchService } from '../../services/match-service.js';
import type { MandateRepository } from '../../ports/mandate-repository.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { DocumentRepository } from '../../ports/document-repository.js';
import type { CandidacyRepository } from '../../ports/candidacy-repository.js';
import type { EmbeddingProvider } from '../../ports/embedding-provider.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  MATCH_SERVICE,
  MANDATE_REPOSITORY,
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  CANDIDACY_REPOSITORY,
  EMBEDDING_PROVIDER,
} from '../tokens.js';

/** Mandate → shortlist ranking (ADR-0051 port of MatchController). */
@Controller('api/v1/mandates/:id')
@UseGuards(AuthGuard)
export class MatchController {
  constructor(@Inject(MATCH_SERVICE) private readonly service: MatchService) {}

  @Post('match')
  @HttpCode(200)
  async match(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(matchRequestSchema))
    body: ReturnType<typeof matchRequestSchema.parse>,
  ) {
    return { matches: await this.service.rankForMandate(scope, id, body.jobText, body.limit) };
  }
}

/** Match feature slice (ADR-0051): MatchService wired via useFactory. */
@Module({
  controllers: [MatchController],
  providers: [
    {
      provide: MATCH_SERVICE,
      useFactory: (
        mandateRepository: MandateRepository,
        talentRepository: TalentRepository,
        documentRepository: DocumentRepository,
        candidacyRepository: CandidacyRepository,
        embeddingProvider: EmbeddingProvider,
      ) =>
        new MatchService({
          mandateRepository,
          talentRepository,
          documentRepository,
          candidacyRepository,
          embeddingProvider,
        }),
      inject: [
        MANDATE_REPOSITORY,
        TALENT_REPOSITORY,
        DOCUMENT_REPOSITORY,
        CANDIDACY_REPOSITORY,
        EMBEDDING_PROVIDER,
      ],
    },
  ],
  exports: [MATCH_SERVICE],
})
export class MatchModule {}
