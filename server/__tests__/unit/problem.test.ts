import { jest } from '@jest/globals';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { errorHandler, notFound, sendProblem } from '../../src/http/problem.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  AiNotConfiguredError,
  AiConsentRequiredError,
  FrozenError,
  InternalError,
  NoTextError,
  NotFoundError,
  PostingFetchError,
  SsrfBlockedError,
  ValidationError,
} from '../../src/domain/errors.js';
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

  it('MapErrorToProblem_AiNotConfiguredError_Returns503ProblemJson', () => {
    const res = mockRes();
    run(new AiNotConfiguredError(), res);
    expect(res.statusCode).toBe(503);
    expect(res.contentType).toBe('application/problem+json');
    expect(res.body).toMatchObject({ status: 503, type: 'about:blank#ai-not-configured' });
  });

  it('Handler_AiNotConfiguredError_LogsInfoWithoutStack', () => {
    // A keyless server answering 503 ai-not-configured is the by-design response,
    // not a server fault: it must not be logged as an error with a stack trace.
    const error = jest.fn();
    const info = jest.fn();
    const res = mockRes();
    run(new AiNotConfiguredError(), res, { ...silentLogger, error, info });
    expect(res.statusCode).toBe(503);
    expect(error).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
  });

  it('Catch_AiNotConfiguredError_LogsInfoWithoutStack', () => {
    // Same contract for the active NestJS filter (the Express handler above is
    // retired): 503 ai-not-configured is info, never error+stack.
    const error = jest.fn();
    const info = jest.fn();
    const filter = new ProblemJsonFilter({ info, warn: jest.fn(), error, debug: jest.fn() });
    const json = jest.fn();
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      json,
    };
    const host = { switchToHttp: () => ({ getResponse: () => res }) };
    filter.catch(new AiNotConfiguredError(), host as never);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'about:blank#ai-not-configured' }),
    );
    expect(error).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
  });

  it('MapErrorToProblem_InternalError_Returns500ProblemJson', () => {
    const res = mockRes();
    run(new InternalError('PDF text extraction failed'), res);
    expect(res.statusCode).toBe(500);
    expect(res.contentType).toBe('application/problem+json');
    expect(res.body).toMatchObject({
      status: 500,
      type: 'about:blank#internal-error',
      title: 'InternalError',
      detail: 'PDF text extraction failed',
    });
  });

  it('Problem_SsrfBlockedError_MapsTo400SsrfBlocked', () => {
    const res = mockRes();
    run(new SsrfBlockedError(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ status: 400, type: 'about:blank#ssrf-blocked' });
  });

  it('Problem_NoTextError_MapsTo422', () => {
    const res = mockRes();
    run(new NoTextError(), res);
    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({ status: 422, type: 'about:blank#no-text' });
  });

  it('Problem_PostingFetchError_MapsTo502WithReasonInDetail', () => {
    for (const reason of ['redirect-limit', 'too-large', 'timeout']) {
      const res = mockRes();
      run(new PostingFetchError(reason), res);
      expect(res.statusCode).toBe(502);
      expect(res.body).toMatchObject({ status: 502, type: 'about:blank#posting-fetch' });
      expect(res.body.detail).toContain(reason);
    }
  });

  it('MapErrorToProblem_FrozenError_409Frozen', () => {
    const res = mockRes();
    run(new FrozenError(), res);
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ status: 409, type: 'about:blank#frozen', title: 'Frozen' });
  });

  it('MapErrorToProblem_AiConsentRequired_403AiConsentRequired', () => {
    const res = mockRes();
    run(new AiConsentRequiredError(), res);
    expect(res.statusCode).toBe(403);
    expect(res.contentType).toBe('application/problem+json');
    expect(res.body).toMatchObject({
      status: 403,
      type: 'about:blank#ai-consent-required',
      title: 'AiConsentRequired',
    });
    expect(res.body.detail).toContain('AI processing');
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
