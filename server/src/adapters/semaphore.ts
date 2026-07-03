/**
 * A minimal async counting semaphore (ADR-0032). Bounds how many async
 * operations run at once — used to cap concurrent headless-Chromium pages so a
 * burst of PDF exports can't exhaust memory. Pure and dependency-free, so it is
 * unit-tested directly.
 */
export class Semaphore {
  private permits: number;
  private readonly waiters: (() => void)[] = [];

  constructor(permits: number) {
    // At least one permit — a zero would deadlock every caller.
    this.permits = Math.max(1, Math.floor(permits));
  }

  private async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits -= 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();
    // Hand the freed permit straight to the next waiter (FIFO); only return it
    // to the pool when nobody is queued.
    if (next) next();
    else this.permits += 1;
  }

  /** Run `fn` once a permit is free, releasing it afterwards (even on throw). */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
