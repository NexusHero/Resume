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
import { createObservationSchema } from '../../domain/interview-observation.js';
import { InterviewObservationService } from '../../services/interview-observation-service.js';
import type { InterviewObservationRepository } from '../../ports/interview-observation-repository.js';
import type { MandateRepository } from '../../ports/mandate-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  INTERVIEW_OBSERVATION_SERVICE,
  INTERVIEW_OBSERVATION_REPOSITORY,
  MANDATE_REPOSITORY,
  CLOCK,
  ID_GENERATOR,
} from '../tokens.js';

/** Interview observations under /api/v1/mandates/:id/observations (ADR-0051). */
@Controller('api/v1/mandates/:id/observations')
@UseGuards(AuthGuard)
export class ObservationsController {
  constructor(
    @Inject(INTERVIEW_OBSERVATION_SERVICE) private readonly service: InterviewObservationService,
  ) {}

  @Get()
  forMandate(@CurrentScope() scope: string, @Param('id') mandateId: string) {
    return this.service.forMandate(scope, mandateId);
  }

  @Post()
  @HttpCode(201)
  async record(
    @CurrentScope() scope: string,
    @Param('id') mandateId: string,
    @Body(new ZodValidationPipe(createObservationSchema))
    input: ReturnType<typeof createObservationSchema.parse>,
  ) {
    return { observation: await this.service.record(scope, mandateId, input) };
  }
}

@Module({
  controllers: [ObservationsController],
  providers: [
    {
      provide: INTERVIEW_OBSERVATION_SERVICE,
      useFactory: (
        interviewObservationRepository: InterviewObservationRepository,
        mandateRepository: MandateRepository,
        clock: Clock,
        idGenerator: IdGenerator,
      ) =>
        new InterviewObservationService({
          interviewObservationRepository,
          mandateRepository,
          clock,
          idGenerator,
        }),
      inject: [INTERVIEW_OBSERVATION_REPOSITORY, MANDATE_REPOSITORY, CLOCK, ID_GENERATOR],
    },
  ],
})
export class ObservationsModule {}
