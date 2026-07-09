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

/**
 * Map any thrown error to an RFC-9457 problem. Pure and framework-agnostic so
 * both the Express error middleware and the NestJS exception filter (ADR-0051)
 * produce byte-identical responses. A 5xx (unknown error) is logged; return
 * value never leaks internals. Returns the problem plus whether it was a 5xx so
 * the caller can decide on logging.
 */
export function mapErrorToProblem(err: unknown): Problem {
  if (err instanceof ZodError) {
    return {
      type: 'about:blank#validation-error',
      title: 'Validation failed',
      status: 400,
      detail: 'The request body is invalid.',
      errors: err.flatten(),
    };
  }
  if (err instanceof DomainError) {
    return {
      type: `about:blank#${err.type}`,
      title: err.name,
      status: err.status,
      detail: err.message,
      errors: err instanceof ValidationError ? err.details : undefined,
    };
  }
  // Body-parser & other http-errors carry a real client status (413 payload
  // too large, 400 malformed JSON) — surface it instead of a generic 500.
  const httpStatus = clientHttpStatus(err);
  if (httpStatus !== null) {
    return {
      type: 'about:blank',
      title: httpStatus === 413 ? 'Payload Too Large' : 'Bad Request',
      status: httpStatus,
      detail: err instanceof Error ? err.message : 'The request could not be processed.',
    };
  }
  return {
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred.',
  };
}

/** Express error middleware mapping known errors to problem+json. */
export function errorHandler(logger: Logger) {
  return (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const problem = mapErrorToProblem(err);
    if (problem.status >= 500) {
      logger.error({ err: err instanceof Error ? err.stack : String(err) }, 'unhandled error');
    }
    sendProblem(res, problem);
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
