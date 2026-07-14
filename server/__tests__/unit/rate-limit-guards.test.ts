import type { ExecutionContext } from '@nestjs/common';
import { AuthRateLimitGuard } from '../../src/nest/auth-rate-limit.guard.js';
import { AiRateLimitGuard } from '../../src/nest/ai-rate-limit.guard.js';
import { RateLimitError } from '../../src/domain/errors.js';
import type { AppConfig } from '../../src/config.js';

function ctxFor(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function configWithLimit(limit: number): AppConfig {
  return { security: { aiRateLimitPerMinute: limit } } as unknown as AppConfig;
}

describe('AuthRateLimitGuard', () => {
  it('Allows_UnderTheLimit', () => {
    const guard = new AuthRateLimitGuard();
    const ctx = ctxFor({ ip: '1.2.3.4' });
    for (let i = 0; i < 10; i++) expect(guard.canActivate(ctx)).toBe(true);
  });

  it('Throws_OverTheLimit', () => {
    const guard = new AuthRateLimitGuard();
    const ctx = ctxFor({ ip: '1.2.3.4' });
    for (let i = 0; i < 10; i++) guard.canActivate(ctx);
    expect(() => guard.canActivate(ctx)).toThrow(RateLimitError);
  });

  it('TracksDistinctIpsSeparately', () => {
    const guard = new AuthRateLimitGuard();
    for (let i = 0; i < 10; i++) guard.canActivate(ctxFor({ ip: 'a' }));
    expect(() => guard.canActivate(ctxFor({ ip: 'a' }))).toThrow(RateLimitError);
    expect(guard.canActivate(ctxFor({ ip: 'b' }))).toBe(true); // untouched bucket
  });

  it('SweepsExpiredWindows_SoTheMapDoesNotGrowUnbounded', () => {
    const guard = new AuthRateLimitGuard();
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      // One client's window expires...
      guard.canActivate(ctxFor({ ip: 'stale-client' }));
      now += 15 * 60 * 1000 + 1; // past the 15-minute window
      // ...and enough distinct-client requests pass to trigger a sweep (every
      // 200 hits) — the stale entry must be gone afterward, not merely reset.
      for (let i = 0; i < 200; i++) guard.canActivate(ctxFor({ ip: `client-${i}` }));
      const windows = (guard as unknown as { windows: Map<string, unknown> }).windows;
      expect(windows.has('stale-client')).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });
});

describe('AiRateLimitGuard', () => {
  it('Disabled_WhenLimitIsZero', () => {
    const guard = new AiRateLimitGuard(configWithLimit(0));
    const ctx = ctxFor({ ip: '1.2.3.4' });
    for (let i = 0; i < 1000; i++) expect(guard.canActivate(ctx)).toBe(true);
  });

  it('Disabled_WhenLimitIsNotANumber_NotSilentlyUnlimitedButExplicitlyOff', () => {
    // A malformed AI_RATE_LIMIT_PER_MINUTE resolves to NaN in config.ts; the
    // guard must treat that the same as "disabled" (return true immediately),
    // not silently never-enforce while callers believe a limit is active.
    const guard = new AiRateLimitGuard(configWithLimit(Number.NaN));
    const ctx = ctxFor({ ip: '1.2.3.4' });
    expect(guard.canActivate(ctx)).toBe(true);
    // no window was ever created for a disabled guard
    expect((guard as unknown as { windows: Map<string, unknown> }).windows.size).toBe(0);
  });

  it('Throws_OverTheLimit', () => {
    const guard = new AiRateLimitGuard(configWithLimit(3));
    const ctx = ctxFor({ ip: '1.2.3.4' });
    for (let i = 0; i < 3; i++) guard.canActivate(ctx);
    expect(() => guard.canActivate(ctx)).toThrow(RateLimitError);
  });

  it('KeysByUserIdWhenAuthenticated_FallsBackToIp', () => {
    const guard = new AiRateLimitGuard(configWithLimit(2));
    for (let i = 0; i < 2; i++) guard.canActivate(ctxFor({ userId: 'u1', ip: 'shared-proxy-ip' }));
    // A different authenticated user behind the same proxy IP gets their own bucket.
    expect(guard.canActivate(ctxFor({ userId: 'u2', ip: 'shared-proxy-ip' }))).toBe(true);
    expect(() => guard.canActivate(ctxFor({ userId: 'u1', ip: 'shared-proxy-ip' }))).toThrow(
      RateLimitError,
    );
  });

  it('SweepsExpiredWindows_SoTheMapDoesNotGrowUnbounded', () => {
    const guard = new AiRateLimitGuard(configWithLimit(30));
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      guard.canActivate(ctxFor({ ip: 'stale-client' }));
      now += 60_000 + 1; // past the 1-minute window
      for (let i = 0; i < 200; i++) guard.canActivate(ctxFor({ ip: `client-${i}` }));
      const windows = (guard as unknown as { windows: Map<string, unknown> }).windows;
      expect(windows.has('stale-client')).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });
});
