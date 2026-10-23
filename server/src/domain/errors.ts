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

/** The caller is authenticated but lacks permission for the action (403). */
export class ForbiddenError extends DomainError {
  readonly status = 403;
  readonly type = 'forbidden';

  constructor(message = 'You are not allowed to do that') {
    super(message);
  }
}

/** The feature needs a higher subscription plan (402 Payment Required). */
export class PlanRequiredError extends DomainError {
  readonly status = 402;
  readonly type = 'plan-required';

  constructor(public readonly requiredPlan: string) {
    super(`This feature requires the ${requiredPlan} plan.`);
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

/** The caller exceeded a request-rate limit (429). */
export class RateLimitError extends DomainError {
  readonly status = 429;
  readonly type = 'rate-limit';

  constructor(message = 'AI request limit reached. Please wait a minute and try again.') {
    super(message);
    // The problem+json title is the error's name; keep the exact title the
    // retired express-rate-limit handler sent so the API contract is unchanged.
    this.name = 'Too Many Requests';
  }
}

/** The configured AI provider rejected or failed the request (502). */
export class UpstreamProviderError extends DomainError {
  readonly status = 502;
  readonly type = 'upstream-provider';

  constructor(message = 'The AI provider could not produce a usable result.') {
    super(message);
  }
}

/**
 * No AI provider is configured on the server (503). The product contract is
 * "no template fallback, no silent failure": a generative route answers with a
 * clear `ai-not-configured` problem instead of fabricating text (ADR-0057).
 */
export class AiNotConfiguredError extends DomainError {
  readonly status = 503;
  readonly type = 'ai-not-configured';

  constructor(
    message = 'KI nicht eingerichtet — konfiguriere ANTHROPIC_API_KEY (oder GEMINI_API_KEY) in den Server-Umgebungsvariablen.',
  ) {
    super(message);
  }
}
