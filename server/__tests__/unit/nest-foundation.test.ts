import 'reflect-metadata';
import { z, ZodError } from 'zod';
import { HttpException, type ArgumentsHost } from '@nestjs/common';
import { ZodValidationPipe } from '../../src/nest/zod-validation.pipe.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { noopLogger } from '../support/fakes.js';

describe('ZodValidationPipe', () => {
  const schema = z.object({ q: z.string().min(1) });
  const pipe = new ZodValidationPipe(schema);

  it('Transform_ValidInput_ReturnsParsed', () => {
    expect(pipe.transform({ q: 'rust' })).toEqual({ q: 'rust' });
  });

  it('Transform_InvalidInput_ThrowsZodError', () => {
    expect(() => pipe.transform({ q: '' })).toThrow(ZodError);
  });
});

/** A fake Express response capturing the problem+json a filter writes. */
function fakeRes() {
  const captured: { status?: number; type?: string; body?: unknown } = {};
  const res = {
    headersSent: false,
    status(code: number) {
      captured.status = code;
      return res;
    },
    type(t: string) {
      captured.type = t;
      return res;
    },
    json(body: unknown) {
      captured.body = body;
      return res;
    },
  };
  return { res, captured };
}

function host(res: unknown): ArgumentsHost {
  return {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }),
  } as unknown as ArgumentsHost;
}

describe('ProblemJsonFilter', () => {
  const filter = new ProblemJsonFilter(noopLogger);

  it('Catch_ZodError_Maps400ValidationProblem', () => {
    const { res, captured } = fakeRes();
    let err: unknown;
    try {
      z.object({ q: z.string() }).parse({ q: 1 });
    } catch (e) {
      err = e;
    }
    filter.catch(err, host(res));
    expect(captured.status).toBe(400);
    expect(captured.type).toBe('application/problem+json');
    expect(captured.body).toMatchObject({
      type: 'about:blank#validation-error',
      title: 'Validation failed',
      status: 400,
    });
  });

  it('Catch_DomainError_MapsStatusAndType', () => {
    const { res, captured } = fakeRes();
    filter.catch(new NotFoundError('Mandate not found'), host(res));
    expect(captured.body).toMatchObject({
      type: 'about:blank#not-found',
      title: 'NotFoundError',
      status: 404,
      detail: 'Mandate not found',
    });
  });

  it('Catch_ValidationError_IncludesDetails', () => {
    const { res, captured } = fakeRes();
    filter.catch(new ValidationError('bad fee', { fee: 'not a number' }), host(res));
    expect(captured.body).toMatchObject({ status: 400, errors: { fee: 'not a number' } });
  });

  it('Catch_NestHttpException_MapsFromStatus', () => {
    const { res, captured } = fakeRes();
    filter.catch(new HttpException('Forbidden', 403), host(res));
    expect(captured.status).toBe(403);
    expect(captured.body).toMatchObject({ status: 403, detail: 'Forbidden' });
  });

  it('Catch_UnknownError_Maps500', () => {
    const { res, captured } = fakeRes();
    filter.catch(new Error('kaboom'), host(res));
    expect(captured.body).toMatchObject({ status: 500, title: 'Internal Server Error' });
    // internals never leak
    expect(JSON.stringify(captured.body)).not.toContain('kaboom');
  });

  it('Catch_HeadersAlreadySent_DoesNothing', () => {
    const { res, captured } = fakeRes();
    res.headersSent = true;
    filter.catch(new Error('late'), host(res));
    expect(captured.status).toBeUndefined();
  });
});
