import type { ExecutionContext } from '@nestjs/common';
import { AuthRateLimitGuard } from '../../src/nest/auth-rate-limit.guard.js';
import { AiRateLimitGuard } from '../../src/nest/ai-rate-limit.guard.js';
import { InMemoryRateLimiter } from '../../src/adapters/in-memory-rate-limiter.js';
import { RateLimitError } from '../../src/domain/errors.js';
import type { RateLimiter } from '../../src/ports/rate-limiter.js';
import type { AppConfig } from '../../src/config.js';

function ctxFor(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function configWithLimit(limit: number): AppConfig {
  return { security: { aiRateLimitPerMinute: limit } } as unknown as AppConfig;
}

/** Records every call it receives instead of counting, so a test can assert
 * exactly what the guard delegated without depending on window semantics. */
function recordingLimiter(): RateLimiter & { calls: Array<[string, number]> } {
  const calls: Array<[string, number]> = [];
  return {
    calls,
    async hit(key: string, windowMs: number) {
      calls.push([key, windowMs]);
      return { count: 1 };
    },
  };
}

describe('AuthRateLimitGuard', () => {
  it('Allows_UnderTheLimit', async () => {
    const guard = new AuthRateLimitGuard(new InMemoryRateLimiter());
    const ctx = ctxFor({ ip: '1.2.3.4' });
    for (let i = 0; i < 10; i++) expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('Throws_OverTheLimit', async () => {
    const guard = new AuthRateLimitGuard(new InMemoryRateLimiter());
    const ctx = ctxFor({ ip: '1.2.3.4' });
    for (let i = 0; i < 10; i++) await guard.canActivate(ctx);
    await expect(guard.canActivate(ctx)).rejects.toThrow(RateLimitError);
  });

  it('TracksDistinctIpsSeparately', async () => {
    const guard = new AuthRateLimitGuard(new InMemoryRateLimiter());
    for (let i = 0; i < 10; i++) await guard.canActivate(ctxFor({ ip: 'a' }));
    await expect(guard.canActivate(ctxFor({ ip: 'a' }))).rejects.toThrow(RateLimitError);
    expect(await guard.canActivate(ctxFor({ ip: 'b' }))).toBe(true); // untouched bucket
  });

  it('DelegatesToTheInjectedRateLimiter', async () => {
    const limiter = recordingLimiter();
    const guard = new AuthRateLimitGuard(limiter);
    await guard.canActivate(ctxFor({ ip: '1.2.3.4' }));
    expect(limiter.calls).toEqual([['1.2.3.4', 15 * 60 * 1000]]);
  });
});

describe('AiRateLimitGuard', () => {
  it('Disabled_WhenLimitIsZero', async () => {
    const guard = new AiRateLimitGuard(configWithLimit(0), new InMemoryRateLimiter());
    const ctx = ctxFor({ ip: '1.2.3.4' });
    for (let i = 0; i < 1000; i++) expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('Disabled_WhenLimitIsNotANumber_NotSilentlyUnlimitedButExplicitlyOff', async () => {
    // A malformed AI_RATE_LIMIT_PER_MINUTE resolves to NaN in config.ts; the
    // guard must treat that the same as "disabled" (return true immediately),
    // not silently never-enforce while callers believe a limit is active.
    const limiter = recordingLimiter();
    const guard = new AiRateLimitGuard(configWithLimit(Number.NaN), limiter);
    const ctx = ctxFor({ ip: '1.2.3.4' });
    expect(await guard.canActivate(ctx)).toBe(true);
    // no hit was ever recorded for a disabled guard
    expect(limiter.calls).toEqual([]);
  });

  it('Throws_OverTheLimit', async () => {
    const guard = new AiRateLimitGuard(configWithLimit(3), new InMemoryRateLimiter());
    const ctx = ctxFor({ ip: '1.2.3.4' });
    for (let i = 0; i < 3; i++) await guard.canActivate(ctx);
    await expect(guard.canActivate(ctx)).rejects.toThrow(RateLimitError);
  });

  it('KeysByUserIdWhenAuthenticated_FallsBackToIp', async () => {
    const guard = new AiRateLimitGuard(configWithLimit(2), new InMemoryRateLimiter());
    for (let i = 0; i < 2; i++)
      await guard.canActivate(ctxFor({ userId: 'u1', ip: 'shared-proxy-ip' }));
    // A different authenticated user behind the same proxy IP gets their own bucket.
    expect(await guard.canActivate(ctxFor({ userId: 'u2', ip: 'shared-proxy-ip' }))).toBe(true);
    await expect(
      guard.canActivate(ctxFor({ userId: 'u1', ip: 'shared-proxy-ip' })),
    ).rejects.toThrow(RateLimitError);
  });

  it('DelegatesToTheInjectedRateLimiter', async () => {
    const limiter = recordingLimiter();
    const guard = new AiRateLimitGuard(configWithLimit(30), limiter);
    await guard.canActivate(ctxFor({ ip: '1.2.3.4' }));
    expect(limiter.calls).toEqual([['1.2.3.4', 60_000]]);
  });
});
