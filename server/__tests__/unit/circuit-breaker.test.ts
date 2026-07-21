import { circuitBreaker, CircuitOpenError } from '../../src/adapters/circuit-breaker.js';
import type { HttpFetch, HttpResponse } from '../../src/ports/http-fetch.js';

const ok: HttpResponse = { ok: true, status: 200, json: async () => ({ data: [] }) };

/** A controllable clock so tests can jump past resetTimeoutMs without waiting. */
function fakeClock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('circuitBreaker', () => {
  it('Closed_Success_PassesThroughWithNoInterference', async () => {
    let calls = 0;
    const good: HttpFetch = async () => {
      calls += 1;
      return ok;
    };
    const fetch = circuitBreaker(good, { failureThreshold: 3, resetTimeoutMs: 1000 });
    const res = await fetch('https://board.example');
    expect(res.ok).toBe(true);
    expect(calls).toBe(1);
  });

  it('Closed_FailuresBelowThreshold_StaysClosedAndKeepsCallingInner', async () => {
    let calls = 0;
    const down: HttpFetch = async () => {
      calls += 1;
      throw new Error('503');
    };
    const fetch = circuitBreaker(down, { failureThreshold: 3, resetTimeoutMs: 1000 });
    await expect(fetch('https://board.example')).rejects.toThrow('503');
    await expect(fetch('https://board.example')).rejects.toThrow('503');
    expect(calls).toBe(2); // below the threshold of 3 — still forwarding to inner
  });

  it('ConsecutiveFailuresReachThreshold_OpensAndNextCallRejectsWithoutCallingInner', async () => {
    let calls = 0;
    const down: HttpFetch = async () => {
      calls += 1;
      throw new Error('503');
    };
    const fetch = circuitBreaker(down, {
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      label: 'TestBoard',
    });
    await expect(fetch('https://board.example')).rejects.toThrow('503');
    await expect(fetch('https://board.example')).rejects.toThrow('503');
    expect(calls).toBe(2);

    // Circuit is now open — the next call must fail fast with no network call.
    await expect(fetch('https://board.example')).rejects.toThrow(CircuitOpenError);
    await expect(fetch('https://board.example')).rejects.toThrow(
      'circuit open for TestBoard: too many recent failures',
    );
    expect(calls).toBe(2); // inner was NOT called again
  });

  it('OpenCircuit_ResetTimeoutElapsed_AllowsOneHalfOpenTrialThrough', async () => {
    const clock = fakeClock();
    let calls = 0;
    const down: HttpFetch = async () => {
      calls += 1;
      throw new Error('503');
    };
    const fetch = circuitBreaker(down, {
      failureThreshold: 1,
      resetTimeoutMs: 5000,
      now: clock.now,
    });
    await expect(fetch('https://board.example')).rejects.toThrow('503');
    expect(calls).toBe(1); // opened after a single failure

    // Still within the reset window: fails fast, no new call to inner.
    clock.advance(4999);
    await expect(fetch('https://board.example')).rejects.toThrow(CircuitOpenError);
    expect(calls).toBe(1);

    // Reset window elapsed: the next call is a half-open trial that reaches inner.
    clock.advance(1);
    await expect(fetch('https://board.example')).rejects.toThrow('503');
    expect(calls).toBe(2);
  });

  it('HalfOpenTrialSucceeds_ClosesCircuitAndSubsequentCallsGoThroughNormally', async () => {
    const clock = fakeClock();
    let calls = 0;
    let failing = true;
    const flaky: HttpFetch = async () => {
      calls += 1;
      if (failing) throw new Error('503');
      return ok;
    };
    const fetch = circuitBreaker(flaky, {
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    });
    await expect(fetch('https://board.example')).rejects.toThrow('503'); // opens
    clock.advance(1000);

    failing = false; // the board recovers before the trial
    const res = await fetch('https://board.example'); // half-open trial succeeds
    expect(res.ok).toBe(true);
    expect(calls).toBe(2);

    // Circuit is closed again — normal calls go straight through.
    const res2 = await fetch('https://board.example');
    expect(res2.ok).toBe(true);
    expect(calls).toBe(3);
  });

  it('HalfOpen_ConcurrentCallWhileTrialInFlight_FailsFastWithoutCallingInner', async () => {
    const clock = fakeClock();
    let calls = 0;
    let resolveTrial: ((res: HttpResponse) => void) | undefined;
    const slowToRecover: HttpFetch = async () => {
      calls += 1;
      if (calls === 1) throw new Error('503'); // initial failure opens the circuit
      return new Promise<HttpResponse>((resolve) => {
        resolveTrial = resolve;
      });
    };
    const fetch = circuitBreaker(slowToRecover, {
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    });
    await expect(fetch('https://board.example')).rejects.toThrow('503'); // opens
    clock.advance(1000);

    const trial = fetch('https://board.example'); // half-open trial, still pending
    // A second call arriving while the trial is in flight must not sneak
    // through as a second trial — it fails fast just like a fully open circuit.
    await expect(fetch('https://board.example')).rejects.toThrow(CircuitOpenError);
    expect(calls).toBe(2); // only the trial itself reached inner

    resolveTrial?.(ok);
    await expect(trial).resolves.toMatchObject({ ok: true });
  });

  it('HalfOpenTrialFails_ReopensCircuit', async () => {
    const clock = fakeClock();
    let calls = 0;
    const alwaysDown: HttpFetch = async () => {
      calls += 1;
      throw new Error('503');
    };
    const fetch = circuitBreaker(alwaysDown, {
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    });
    await expect(fetch('https://board.example')).rejects.toThrow('503'); // opens
    clock.advance(1000);
    await expect(fetch('https://board.example')).rejects.toThrow('503'); // half-open trial, fails
    expect(calls).toBe(2);

    // Reopened: the very next call fails fast without reaching inner again...
    await expect(fetch('https://board.example')).rejects.toThrow(CircuitOpenError);
    expect(calls).toBe(2);

    // ...until another resetTimeoutMs elapses, which allows a further trial.
    clock.advance(1000);
    await expect(fetch('https://board.example')).rejects.toThrow('503');
    expect(calls).toBe(3);
  });
});
