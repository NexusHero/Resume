import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createTalentSchema, updateTalentSchema } from '../../domain/talent.js';
import { TalentService } from '../../services/talent-service.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { DocumentRepository } from '../../ports/document-repository.js';
import type { TalentDataPurger } from '../../ports/talent-data.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  TALENT_SERVICE,
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  TALENT_DATA_PURGERS,
  CLOCK,
  ID_GENERATOR,
} from '../tokens.js';

/**
 * Talent pool CRUD under /api/v1/talents (ADR-0051 port of TalentController).
 * Team-scoped. (The Pro-gated `POST /talents/import` route is added once the
 * documents + AI slices land, since TalentImportService composes them.)
 */
@Controller('api/v1/talents')
@UseGuards(AuthGuard)
export class TalentsController {
  constructor(@Inject(TALENT_SERVICE) private readonly service: TalentService) {}

  @Get()
  list(@CurrentScope() scope: string) {
    return this.service.listWithSkills(scope);
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(createTalentSchema))
    input: ReturnType<typeof createTalentSchema.parse>,
  ) {
    return { talent: await this.service.create(scope, input) };
  }

  @Patch(':id')
  async update(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTalentSchema))
    patch: ReturnType<typeof updateTalentSchema.parse>,
  ) {
    return { talent: await this.service.update(scope, id, patch) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string): Promise<void> {
    await this.service.remove(scope, id);
  }
}

/** Talents feature slice (ADR-0051): TalentService wired via useFactory. */
@Module({
  controllers: [TalentsController],
  providers: [
    {
      provide: TALENT_SERVICE,
      useFactory: (
        talentRepository: TalentRepository,
        documentRepository: DocumentRepository,
        talentDataPurgers: TalentDataPurger[],
        clock: Clock,
        idGenerator: IdGenerator,
      ) =>
        new TalentService({
          talentRepository,
          documentRepository,
          talentDataPurgers,
          clock,
          idGenerator,
        }),
      inject: [TALENT_REPOSITORY, DOCUMENT_REPOSITORY, TALENT_DATA_PURGERS, CLOCK, ID_GENERATOR],
    },
  ],
  exports: [TALENT_SERVICE],
})
export class TalentsModule {}
