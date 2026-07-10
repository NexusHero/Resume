import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validates/parses a handler argument with a zod schema (ADR-0012/0051). We keep
 * zod as the single source of truth for request shapes rather than switching to
 * class-validator DTOs. A parse failure throws `ZodError`, which the global
 * `ProblemJsonFilter` renders as a 400 `problem+json` identical to the retired
 * Express boundary.
 *
 * Usage: `@Body(new ZodValidationPipe(createMandateSchema)) body: CreateMandate`
 * or `@Query(new ZodValidationPipe(jobQuerySchema)) query: JobQuery`.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}
