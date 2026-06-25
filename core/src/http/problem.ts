import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { DomainError, ValidationError } from '../domain/errors';
import type { Logger } from '../ports/logger';

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
