import { Body, Controller, HttpCode, Inject, Module, Post, UseGuards } from '@nestjs/common';
import { atsRequestSchema } from '../../domain/ats.js';
import { AtsService } from '../../services/ats-service.js';
import type { SkillExtractor } from '../../ports/skill-extractor.js';
import type { CandidateProfile } from '../../domain/skill.js';
import { AuthGuard } from '../auth.guard.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { ATS_SERVICE, SKILL_EXTRACTOR, CANDIDATE_PROFILE } from '../tokens.js';

/** ATS gap analysis under /api/v1/ats (ADR-0051 port of AtsController). */
@Controller('api/v1/ats')
@UseGuards(AuthGuard)
export class AtsController {
  constructor(@Inject(ATS_SERVICE) private readonly service: AtsService) {}

  @Post()
  @HttpCode(200)
  analyze(
    @Body(new ZodValidationPipe(atsRequestSchema)) input: ReturnType<typeof atsRequestSchema.parse>,
  ) {
    return this.service.analyze(input);
  }
}

/** ATS feature slice (ADR-0051): AtsService wired via useFactory. */
@Module({
  controllers: [AtsController],
  providers: [
    {
      provide: ATS_SERVICE,
      useFactory: (skillExtractor: SkillExtractor, candidateProfile: CandidateProfile) =>
        new AtsService({ skillExtractor, candidateProfile }),
      inject: [SKILL_EXTRACTOR, CANDIDATE_PROFILE],
    },
  ],
})
export class AtsModule {}
