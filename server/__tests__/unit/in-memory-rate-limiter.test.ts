import { InMemoryRateLimiter } from '../../src/adapters/in-memory-rate-limiter.js';

describe('InMemoryRateLimiter', () => {
  it('CountsUp_ForRepeatedHitsOnTheSameKeyWithinTheWindow', async () => {
    const limiter = new InMemoryRateLimiter();
    expect(await limiter.hit('a', 1000)).toEqual({ count: 1 });
    expect(await limiter.hit('a', 1000)).toEqual({ count: 2 });
    expect(await limiter.hit('a', 1000)).toEqual({ count: 3 });
  });

  it('TracksDistinctKeysSeparately', async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.hit('a', 1000);
    await limiter.hit('a', 1000);
    expect(await limiter.hit('b', 1000)).toEqual({ count: 1 });
  });

  it('ResetsTheCount_OnceTheWindowExpires', async () => {
    const limiter = new InMemoryRateLimiter();
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      expect(await limiter.hit('a', 1000)).toEqual({ count: 1 });
      now += 1001;
      expect(await limiter.hit('a', 1000)).toEqual({ count: 1 }); // fresh window, not 2
    } finally {
      Date.now = realNow;
    }
  });

  it('SweepsExpiredWindows_SoTheMapDoesNotGrowUnbounded', async () => {
    const limiter = new InMemoryRateLimiter();
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      await limiter.hit('stale-client', 1000);
      now += 1001; // past the window
      // Enough distinct-client hits to trigger a sweep (every 200 hits).
      for (let i = 0; i < 200; i++) await limiter.hit(`client-${i}`, 1000);
      const windows = (limiter as unknown as { windows: Map<string, unknown> }).windows;
      expect(windows.has('stale-client')).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });
});
