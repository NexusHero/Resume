import type { Clock } from '../ports/clock.js';

/** Real wall-clock implementation. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  today(): string {
    return this.now().toISOString().slice(0, 10);
  }

  isoNow(): string {
    return this.now().toISOString();
  }
}
