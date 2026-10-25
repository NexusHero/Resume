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

/**
 * A write was attempted on a frozen job application (AK-4.5, ADR-0061): once
 * `status !== 'draft'` the documents and attachment selection are read-only
 * unless the caller confirms with `?unfreeze=1`.
 */
export class FrozenError extends DomainError {
  readonly status = 409;
  readonly type = 'frozen';

  constructor(
    message = 'Diese Bewerbung ist versendet und eingefroren. Bestätige die Änderung, um fortzufahren.',
  ) {
    super(message);
    this.name = 'Frozen';
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
    message = 'No AI provider is configured on this server. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.',
  ) {
    super(message);
    this.name = 'AI not configured';
  }
}

/**
 * The workspace has not granted the AI consent (403, ADR-0063): CV and ad text
 * may not be sent to the configured provider until an admin consents. 403 —
 * not 409 or 404 — because the caller is authenticated but not (yet) allowed
 * for this action, and the route exists but is not released.
 */
export class AiConsentRequiredError extends DomainError {
  readonly status = 403;
  readonly type = 'ai-consent-required';

  constructor(message = 'AI-Verarbeitung wurde für diesen Workspace noch nicht freigegeben.') {
    super(message);
    this.name = 'AiConsentRequired';
  }
}

/**
 * The uploaded PDF has no usable text layer (422). Scanned/protected files
 * cannot be imported; the UI asks the user to paste the text instead.
 */
export class NoTextLayerError extends DomainError {
  readonly status = 422;
  readonly type = 'no-text-layer';

  constructor(message = 'The PDF contains no readable text (e.g. a scan or protected file).') {
    super(message);
    this.name = 'No text layer';
  }
}

/**
 * An unexpected server-side failure (500). Used where a dependency breaks in a
 * way the caller cannot fix — e.g. a PDF extractor crash (Q1, ADR-0057). The
 * problem+json detail is deliberately generic; the stack is logged server-side.
 */
export class InternalError extends DomainError {
  readonly status = 500;
  readonly type = 'internal-error';

  constructor(message = 'An unexpected error occurred.') {
    super(message);
    this.name = 'InternalError';
  }
}

/**
 * A user-supplied URL resolves to a blocked target — not http(s), or a
 * private/loopback/link-local/mapped address (also on a redirect hop) (400,
 * AK-1.4). Raised by the `ssrf-fetch` adapter before any request reaches an
 * internal target.
 */
export class SsrfBlockedError extends DomainError {
  readonly status = 400;
  readonly type = 'ssrf-blocked';

  constructor(message = 'The URL targets a network address that is not allowed.') {
    super(message);
    this.name = 'SSRF blocked';
  }
}

/**
 * Fetching a posting (or its detail) failed for a reason the caller cannot fix:
 * timeout, size limit, redirect limit, DNS/network error or a non-2xx detail
 * response (502). The `reason` (e.g. `redirect-limit`, `too-large`, `timeout`)
 * is folded into the `detail` message — problem+json carries only `detail`.
 */
export class PostingFetchError extends DomainError {
  readonly status = 502;
  readonly type = 'posting-fetch';

  constructor(readonly reason: string) {
    super(`Could not fetch the posting (${reason}).`);
    this.name = 'Posting fetch failed';
  }
}

/**
 * A URL was fetched but yielded no usable text (a login/JS-only page, an empty
 * body) (422). The UI asks the user to paste the ad text instead (AK-1.5).
 */
export class NoTextError extends DomainError {
  readonly status = 422;
  readonly type = 'no-text';

  constructor(message = 'The page contains no usable posting text.') {
    super(message);
    this.name = 'No text';
  }
}
