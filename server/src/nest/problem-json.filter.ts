import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { mapErrorToProblem, sendProblem, type Problem } from '../http/problem.js';
import type { Logger } from '../ports/logger.js';
import { LOGGER } from './tokens.js';
import { Inject } from '@nestjs/common';

/**
 * Global exception filter that renders every error as RFC-9457 `problem+json`
 * (ADR-0012/0051). Domain errors, ZodError and http-errors go through the shared
 * {@link mapErrorToProblem} so the response is byte-identical to the retired
 * Express error middleware. Nest's own `HttpException`s (a guard's 401/403, the
 * framework 404 for an unknown route) are mapped from their status here. A 5xx
 * is logged; internals never leak.
 */
@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  catch(err: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;

    const problem =
      err instanceof HttpException ? this.fromHttpException(err) : mapErrorToProblem(err);
    if (problem.status >= 500) {
      this.logger.error({ err: err instanceof Error ? err.stack : String(err) }, 'unhandled error');
    }
    sendProblem(res, problem);
  }

  /** Nest HttpException → problem. Its body is a string or `{ message, error }`. */
  private fromHttpException(err: HttpException): Problem {
    const status = err.getStatus();
    const body = err.getResponse();
    const detail =
      typeof body === 'string'
        ? body
        : ((body as { message?: unknown }).message?.toString() ?? err.message);
    // The framework 404 for a route no controller claims ("Cannot GET /…") keeps
    // the exact shape the Express `notFound` handler sent for unknown endpoints.
    if (status === 404 && typeof detail === 'string' && detail.startsWith('Cannot ')) {
      return {
        type: 'about:blank#not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Unknown endpoint.',
      };
    }
    return {
      type: 'about:blank',
      title: err.name.replace(/Exception$/, '') || 'Error',
      status,
      detail,
    };
  }
}
