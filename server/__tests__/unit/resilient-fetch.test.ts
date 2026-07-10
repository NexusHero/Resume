import { resilientFetch } from '../../src/adapters/resilient-fetch.js';
import type { HttpFetch, HttpResponse } from '../../src/ports/http-fetch.js';

const ok: HttpResponse = { ok: true, status: 200, json: async () => ({ data: [] }) };
const noSleep = async () => {};

describe('resilientFetch', () => {
  it('Timeout_HungRequest_AbortsAndThrows', async () => {
    // A source that never resolves until aborted — the timeout must abort it so
    // the search can't hang. With no retries it then throws.
    const hanging: HttpFetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const fetch = resilientFetch(hanging, { timeoutMs: 10, retries: 0, sleep: noSleep });
    await expect(fetch('https://board.example')).rejects.toThrow('aborted');
  });

  it('Retry_TransientFailureThenSuccess_Recovers', async () => {
    let calls = 0;
    const flaky: HttpFetch = async () => {
      calls += 1;
      if (calls === 1) throw new Error('ECONNRESET');
      return ok;
    };
    const fetch = resilientFetch(flaky, { timeoutMs: 1000, retries: 1, sleep: noSleep });
    const res = await fetch('https://board.example');
    expect(res.ok).toBe(true);
    expect(calls).toBe(2); // failed once, retried once
  });

  it('Retry_ExhaustsRetries_ThrowsLastError', async () => {
    let calls = 0;
    const alwaysDown: HttpFetch = async () => {
      calls += 1;
      throw new Error('503');
    };
    const fetch = resilientFetch(alwaysDown, { timeoutMs: 1000, retries: 2, sleep: noSleep });
    await expect(fetch('https://board.example')).rejects.toThrow('503');
    expect(calls).toBe(3); // initial + 2 retries
  });

  it('Success_FirstTry_PassesThrough', async () => {
    let calls = 0;
    const good: HttpFetch = async () => {
      calls += 1;
      return ok;
    };
    const fetch = resilientFetch(good, { timeoutMs: 1000, retries: 3, sleep: noSleep });
    expect((await fetch('https://board.example')).status).toBe(200);
    expect(calls).toBe(1); // no retries when the first attempt works
  });
});
