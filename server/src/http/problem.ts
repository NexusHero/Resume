import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { DomainError, ValidationError } from '../domain/errors.js';
import type { Logger } from '../ports/logger.js';

/** RFC 9457 problem detail. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: unknown;
}

export function sendProblem(res: Response, problem: Problem): void {
  res.status(problem.status).type('application/problem+json').json(problem);
}

/**
 * A client-facing status from an `http-errors`-shaped error (e.g. body-parser:
 * a payload over the size limit is 413, malformed JSON is 400). Only trusted
 * when `expose` is set and the code is a 4xx, so internal errors never leak.
 */
function clientHttpStatus(err: unknown): number | null {
  const e = err as { status?: unknown; expose?: unknown } | null;
  const status = typeof e?.status === 'number' ? e.status : null;
  return status !== null && e?.expose === true && status >= 400 && status < 500 ? status : null;
}

/** Express error middleware mapping known errors to problem+json. */
export function errorHandler(logger: Logger) {
  return (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err instanceof ZodError) {
      sendProblem(res, {
        type: 'about:blank#validation-error',
        title: 'Validation failed',
        status: 400,
        detail: 'The request body is invalid.',
        errors: err.flatten(),
      });
      return;
    }
    if (err instanceof DomainError) {
      sendProblem(res, {
        type: `about:blank#${err.type}`,
        title: err.name,
        status: err.status,
        detail: err.message,
        errors: err instanceof ValidationError ? err.details : undefined,
      });
      return;
    }
    // Body-parser & other http-errors carry a real client status (413 payload
    // too large, 400 malformed JSON) — surface it instead of a generic 500.
    const httpStatus = clientHttpStatus(err);
    if (httpStatus !== null) {
      sendProblem(res, {
        type: 'about:blank',
        title: httpStatus === 413 ? 'Payload Too Large' : 'Bad Request',
        status: httpStatus,
        detail: err instanceof Error ? err.message : 'The request could not be processed.',
      });
      return;
    }
    logger.error({ err: err instanceof Error ? err.stack : String(err) }, 'unhandled error');
    sendProblem(res, {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
    });
  };
}

/** 404 handler for unknown API routes. */
export function notFound(res: Response): void {
  sendProblem(res, {
    type: 'about:blank#not-found',
    title: 'Not Found',
    status: 404,
    detail: 'Unknown endpoint.',
  });
}
