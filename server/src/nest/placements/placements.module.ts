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
import { createPlacementSchema, updatePlacementSchema } from '../../domain/placement.js';
import { PlacementService } from '../../services/placement-service.js';
import type { PlacementRepository } from '../../ports/placement-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { PLACEMENT_SERVICE, PLACEMENT_REPOSITORY, CLOCK, ID_GENERATOR } from '../tokens.js';

/** Placements CRUD under /api/v1/placements (ADR-0051 port of PlacementController). */
@Controller('api/v1/placements')
@UseGuards(AuthGuard)
export class PlacementsController {
  constructor(@Inject(PLACEMENT_SERVICE) private readonly service: PlacementService) {}

  @Get()
  list(@CurrentScope() scope: string) {
    return this.service.list(scope);
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(createPlacementSchema))
    input: ReturnType<typeof createPlacementSchema.parse>,
  ) {
    return { placement: await this.service.create(scope, input) };
  }

  @Patch(':id')
  async update(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlacementSchema))
    patch: ReturnType<typeof updatePlacementSchema.parse>,
  ) {
    return { placement: await this.service.update(scope, id, patch) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string): Promise<void> {
    await this.service.remove(scope, id);
  }
}

/** Placements feature slice (ADR-0051): PlacementService wired via useFactory. */
@Module({
  controllers: [PlacementsController],
  providers: [
    {
      provide: PLACEMENT_SERVICE,
      useFactory: (
        placementRepository: PlacementRepository,
        clock: Clock,
        idGenerator: IdGenerator,
      ) => new PlacementService({ placementRepository, clock, idGenerator }),
      inject: [PLACEMENT_REPOSITORY, CLOCK, ID_GENERATOR],
    },
  ],
  exports: [PLACEMENT_SERVICE],
})
export class PlacementsModule {}
