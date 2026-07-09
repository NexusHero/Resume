import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createMandateSchema, updateMandateSchema } from '../../domain/mandate.js';
import type { MandateService } from '../../services/mandate-service.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { MANDATE_SERVICE } from '../tokens.js';

/**
 * Client mandates CRUD under /api/v1/mandates (ADR-0051 port of the Express
 * MandateController). Team-scoped: `@CurrentScope` supplies the tenant the
 * AuthGuard stamped, so a mandate is only ever read/written within its team.
 */
@Controller('api/v1/mandates')
@UseGuards(AuthGuard)
export class MandatesController {
  constructor(@Inject(MANDATE_SERVICE) private readonly service: MandateService) {}

  @Get()
  list(@CurrentScope() scope: string) {
    return this.service.list(scope);
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(createMandateSchema))
    input: ReturnType<typeof createMandateSchema.parse>,
  ) {
    return { mandate: await this.service.create(scope, input) };
  }

  @Patch(':id')
  async update(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMandateSchema))
    patch: ReturnType<typeof updateMandateSchema.parse>,
  ) {
    return { mandate: await this.service.update(scope, id, patch) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string): Promise<void> {
    await this.service.remove(scope, id);
  }
}
