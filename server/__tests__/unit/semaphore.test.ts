import { Semaphore } from '../../src/adapters/semaphore';

const flush = () => new Promise((r) => setImmediate(r));

describe('Semaphore', () => {
  it('Run_ReturnsTheResult', async () => {
    const sem = new Semaphore(1);
    expect(await sem.run(async () => 42)).toBe(42);
  });

  it('Run_MoreTasksThanPermits_CapsConcurrencyAndDrains', async () => {
    const sem = new Semaphore(2);
    let active = 0;
    let peak = 0;
    const finishers: Array<() => void> = [];
    const task = () =>
      sem.run(
        () =>
          new Promise<void>((resolve) => {
            active += 1;
            peak = Math.max(peak, active);
            finishers.push(() => {
              active -= 1;
              resolve();
            });
          }),
      );

    const all = [task(), task(), task()];
    await flush();

    // Only two of the three are running; the third is queued.
    expect(peak).toBe(2);
    expect(finishers).toHaveLength(2);

    // Finish one → the queued task starts, still never exceeding two.
    finishers.shift()!();
    await flush();
    expect(peak).toBe(2);
    expect(finishers).toHaveLength(2);

    while (finishers.length) {
      finishers.shift()!();
      await flush();
    }
    await Promise.all(all);
  });

  it('Run_TaskThrows_ReleasesThePermit', async () => {
    const sem = new Semaphore(1);
    await expect(sem.run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    // If the permit leaked, this second run would hang; it resolves, so it didn't.
    expect(await sem.run(async () => 'ok')).toBe('ok');
  });

  it('Constructor_ZeroOrNegative_FloorsToOnePermitAndDoesNotDeadlock', async () => {
    const sem = new Semaphore(0);
    expect(await sem.run(async () => 'ran')).toBe('ran');
  });
});
