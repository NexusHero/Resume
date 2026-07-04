import { jest } from '@jest/globals';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { errorHandler, notFound, sendProblem } from '../../src/http/problem.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { Logger } from '../../src/ports/logger.js';

function mockRes(headersSent = false) {
  const res = {
    headersSent,
    statusCode: 0,
    contentType: '',
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    type(t: string) {
      this.contentType = t;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
  return res;
}

const silentLogger: Logger = { info() {}, warn() {}, error() {}, debug() {} };

function run(err: unknown, res: ReturnType<typeof mockRes>, logger: Logger = silentLogger) {
  const next = jest.fn();
  errorHandler(logger)(err, {} as Request, res as unknown as Response, next);
  return next;
}

describe('errorHandler', () => {
  it('Handler_ZodError_Returns400ProblemJson', () => {
    let zodErr: unknown;
    try {
      z.object({ a: z.string() }).parse({});
    } catch (e) {
      zodErr = e;
    }
    const res = mockRes();
    run(zodErr, res);
    expect(res.statusCode).toBe(400);
    expect(res.contentType).toBe('application/problem+json');
    expect(res.body).toMatchObject({ title: 'Validation failed', status: 400 });
  });

  it('Handler_NotFoundError_Returns404', () => {
    const res = mockRes();
    run(new NotFoundError('nope'), res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ status: 404, detail: 'nope' });
  });

  it('Handler_ValidationError_IncludesDetails', () => {
    const res = mockRes();
    run(new ValidationError('bad', { field: 'x' }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ errors: { field: 'x' } });
  });

  it('Handler_GenericError_Returns500AndLogs', () => {
    const error = jest.fn();
    const res = mockRes();
    run(new Error('boom'), res, { ...silentLogger, error });
    expect(res.statusCode).toBe(500);
    expect(error).toHaveBeenCalled();
  });

  it('Handler_HeadersAlreadySent_DelegatesToNext', () => {
    const res = mockRes(true);
    const next = run(new Error('late'), res);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(0);
  });
});

describe('domain errors', () => {
  it('NotFoundError_DefaultMessage_HasStatusAndName', () => {
    const e = new NotFoundError();
    expect(e.status).toBe(404);
    expect(e.message).toBe('Resource not found');
    expect(e.name).toBe('NotFoundError');
    expect(e.type).toBe('not-found');
  });

  it('ValidationError_Defaults_HasNoDetails', () => {
    const e = new ValidationError();
    expect(e.status).toBe(400);
    expect(e.message).toBe('Request validation failed');
    expect(e.details).toBeUndefined();
    expect(e.type).toBe('validation-error');
  });
});

describe('notFound', () => {
  it('NotFound_Returns404Problem', () => {
    const res = mockRes();
    notFound(res as unknown as Response);
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ title: 'Not Found' });
  });
});

describe('sendProblem', () => {
  it('SendProblem_SetsStatusTypeAndBody', () => {
    const res = mockRes();
    sendProblem(res as unknown as Response, { type: 't', title: 'T', status: 418 });
    expect(res.statusCode).toBe(418);
    expect(res.contentType).toBe('application/problem+json');
  });
});
