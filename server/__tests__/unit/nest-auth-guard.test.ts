import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard, OptionalAuthGuard } from '../../src/nest/auth.guard.js';
import { UnauthorizedError } from '../../src/domain/errors.js';
import type { AuthService } from '../../src/services/auth-service.js';
import type { AppConfig } from '../../src/config.js';

const CONFIG = {
  superAdminEmails: ['boss@myjob.de'],
  auth: { sessionCookieName: 'myjob_session' },
} as unknown as AppConfig;

/** A minimal ExecutionContext exposing a request with the given cookie header. */
function ctxWithCookie(cookie?: string): { ctx: ExecutionContext; req: Record<string, unknown> } {
  const req: Record<string, unknown> = { headers: cookie ? { cookie } : {} };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

const authWith = (user: unknown): AuthService =>
  ({ currentUser: async () => user }) as unknown as AuthService;

describe('AuthGuard', () => {
  const user = { id: 'u1', email: 'boss@myjob.de', roles: ['admin'], tenantId: 't1' };

  it('ValidSession_StampsRequestAndAllows', async () => {
    const captured: string[] = [];
    const auth = {
      currentUser: async (token: string | undefined) => {
        captured.push(token ?? '<none>');
        return user;
      },
    } as unknown as AuthService;
    const guard = new AuthGuard(auth, CONFIG);
    const { ctx, req } = ctxWithCookie('other=x; myjob_session=abc123');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(captured).toEqual(['abc123']); // parsed the right cookie
    expect(req).toMatchObject({
      userId: 'u1',
      roles: ['admin'],
      tenantId: 't1',
      isSuperAdmin: true, // email is on the super-admin list
    });
  });

  it('NoSession_ThrowsUnauthorized', async () => {
    const guard = new AuthGuard(authWith(null), CONFIG);
    const { ctx } = ctxWithCookie();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('MalformedCookieSegments_AreSkipped', async () => {
    // a valueless flag segment (no '=') must not break cookie parsing
    const captured: string[] = [];
    const auth = {
      currentUser: async (t: string | undefined) => {
        captured.push(t ?? '<none>');
        return user;
      },
    } as unknown as AuthService;
    const guard = new AuthGuard(auth, CONFIG);
    const { ctx } = ctxWithCookie('flagonly; myjob_session=tok');
    await guard.canActivate(ctx);
    expect(captured).toEqual(['tok']);
  });

  it('NonSuperAdmin_And_NoTenant_DefaultsScope', async () => {
    const guard = new AuthGuard(
      authWith({ id: 'u2', email: 'rec@agency.de', roles: [], tenantId: undefined }),
      CONFIG,
    );
    const { ctx, req } = ctxWithCookie('myjob_session=z');
    await guard.canActivate(ctx);
    expect(req).toMatchObject({ userId: 'u2', isSuperAdmin: false, tenantId: 'team' });
  });
});

describe('OptionalAuthGuard', () => {
  it('Session_StampsUser', async () => {
    const guard = new OptionalAuthGuard(
      authWith({ id: 'u9', email: 'x@y.de', roles: [], tenantId: 't9' }),
      CONFIG,
    );
    const { ctx, req } = ctxWithCookie('myjob_session=s');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req).toMatchObject({ userId: 'u9', tenantId: 't9' });
  });

  it('NoSession_AllowsWithoutStamping', async () => {
    const guard = new OptionalAuthGuard(authWith(null), CONFIG);
    const { ctx, req } = ctxWithCookie();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.userId).toBeUndefined();
  });
});
