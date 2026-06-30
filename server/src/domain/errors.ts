/** Base class for errors that map to a specific HTTP status. */
export abstract class DomainError extends Error {
  abstract readonly status: number;
  abstract readonly type: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A requested resource does not exist (404). */
export class NotFoundError extends DomainError {
  readonly status = 404;
  readonly type = 'not-found';

  constructor(message = 'Resource not found') {
    super(message);
  }
}

/** Authentication failed or is missing (401). */
export class UnauthorizedError extends DomainError {
  readonly status = 401;
  readonly type = 'unauthorized';

  constructor(message = 'Authentication required') {
    super(message);
  }
}

/** The request conflicts with existing state, e.g. a duplicate (409). */
export class ConflictError extends DomainError {
  readonly status = 409;
  readonly type = 'conflict';

  constructor(message = 'Resource already exists') {
    super(message);
  }
}

/** The request payload failed validation (400). */
export class ValidationError extends DomainError {
  readonly status = 400;
  readonly type = 'validation-error';

  constructor(
    message = 'Request validation failed',
    readonly details?: unknown,
  ) {
    super(message);
  }
}
