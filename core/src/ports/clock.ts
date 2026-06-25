/** Abstraction over the current time, for deterministic tests. */
export interface Clock {
  /** Current instant. */
  now(): Date;
  /** Current date as YYYY-MM-DD. */
  today(): string;
  /** Current instant as an ISO 8601 string. */
  isoNow(): string;
}
