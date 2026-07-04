import { AuthService } from '../../src/services/auth-service';
import { registerSchema, loginSchema } from '../../src/domain/user';
import { ConflictError, UnauthorizedError } from '../../src/domain/errors';
import { MemorySessionStore } from '../../src/adapters/memory-session-store';
import {
  InMemoryUserRepository,
  InMemoryTenantRepository,
  fakePasswordHasher,
  FixedClock,
  SequenceIdGenerator,
} from '../support/fakes';
import { loadConfig } from '../../src/config';

function makeService() {
  const repo = new InMemoryUserRepository();
  const sessions = new MemorySessionStore();
  const service = new AuthService({
    userRepository: repo,
    sessionStore: sessions,
    passwordHasher: fakePasswordHasher,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('user'),
  });
  return { service, repo, sessions };
}

const reg = (email: string, password = 'supersecret') => registerSchema.parse({ email, password });

describe('AuthService', () => {
  it('Register_NewEmail_CreatesHashedUserAndSession', async () => {
    const { service, repo } = makeService();
    const res = await service.register(reg('A@Example.com'));
    expect(res.user).toMatchObject({ id: 'user1', email: 'a@example.com' });
    expect(res.user).not.toHaveProperty('passwordHash');
    expect(typeof res.token).toBe('string');
    expect(repo.users).toHaveLength(1);
    expect(repo.users[0]?.passwordHash).toBe('hashed:supersecret');
  });

  it('Register_FirstAccount_BecomesAdmin', async () => {
    const { service, repo } = makeService();
    const first = await service.register(reg('boss@example.com'));
    expect(first.user.roles).toEqual(['admin', 'recruiter']);
    const second = await service.register(reg('teammate@example.com'));
    expect(second.user.roles).toEqual(['recruiter']);
    expect(repo.users[0]?.roles).toContain('admin');
  });

  it('Register_DuplicateEmail_ThrowsConflict', async () => {
    const { service } = makeService();
    await service.register(reg('a@example.com'));
    await expect(service.register(reg('a@example.com', 'another1'))).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('Login_ValidCredentials_ReturnsUserAndSession', async () => {
    const { service } = makeService();
    await service.register(reg('a@example.com'));
    const res = await service.login(
      loginSchema.parse({ email: 'a@example.com', password: 'supersecret' }),
    );
    expect(res.user.email).toBe('a@example.com');
    expect(typeof res.token).toBe('string');
  });

  it('Login_WrongPassword_ThrowsUnauthorized', async () => {
    const { service } = makeService();
    await service.register(reg('a@example.com'));
    await expect(
      service.login(loginSchema.parse({ email: 'a@example.com', password: 'wrongpass' })),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('Login_UnknownEmail_ThrowsUnauthorized', async () => {
    const { service } = makeService();
    await expect(
      service.login(loginSchema.parse({ email: 'nope@example.com', password: 'whatever1' })),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('CurrentUser_ValidToken_ReturnsUser', async () => {
    const { service } = makeService();
    const { token } = await service.register(reg('a@example.com'));
    expect(await service.currentUser(token)).toMatchObject({ email: 'a@example.com' });
  });

  it('CurrentUser_NoToken_ReturnsNull', async () => {
    const { service } = makeService();
    expect(await service.currentUser(undefined)).toBeNull();
  });

  it('CurrentUser_UnknownToken_ReturnsNull', async () => {
    const { service } = makeService();
    expect(await service.currentUser('bogus')).toBeNull();
  });

  it('CurrentUser_SessionForMissingUser_ReturnsNull', async () => {
    const { service, sessions } = makeService();
    const token = await sessions.create('ghost');
    expect(await service.currentUser(token)).toBeNull();
  });

  it('Logout_DestroysSession', async () => {
    const { service } = makeService();
    const { token } = await service.register(reg('a@example.com'));
    await service.logout(token);
    expect(await service.currentUser(token)).toBeNull();
  });

  it('Logout_NoToken_NoOp', async () => {
    const { service } = makeService();
    await expect(service.logout(undefined)).resolves.toBeUndefined();
  });
});

describe('AuthService — self-serve tenants (ADR-0036)', () => {
  function makeSelfServe() {
    const repo = new InMemoryUserRepository();
    const tenants = new InMemoryTenantRepository();
    const service = new AuthService({
      userRepository: repo,
      sessionStore: new MemorySessionStore(),
      passwordHasher: fakePasswordHasher,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('id'),
      tenantRepository: tenants,
      config: loadConfig({ SELF_SERVE_TENANTS: 'true' }),
    });
    return { service, repo, tenants };
  }

  it('Register_CreatesOwnTenant_AndMakesUserItsAdmin', async () => {
    const { service, repo, tenants } = makeSelfServe();
    const res = await service.register(reg('founder@acme.io'));
    expect(tenants.tenants).toHaveLength(1);
    const tenant = tenants.tenants[0]!;
    expect(tenant.status).toBe('active');
    expect(tenant.name).toBe("founder's workspace"); // derived default
    expect(res.user.tenantId).toBe(tenant.id);
    expect(res.user.roles).toEqual(['admin', 'recruiter']);
    expect(repo.users[0]?.tenantId).toBe(tenant.id);
  });

  it('Register_UsesProvidedWorkspaceName', async () => {
    const { service, tenants } = makeSelfServe();
    await service.register(
      registerSchema.parse({
        email: 'a@acme.io',
        password: 'supersecret',
        workspaceName: 'Acme Recruiting',
      }),
    );
    expect(tenants.tenants[0]?.name).toBe('Acme Recruiting');
  });

  it('Register_EachSignupIsAnIsolatedTenant', async () => {
    const { service, tenants } = makeSelfServe();
    const a = await service.register(reg('a@acme.io'));
    const b = await service.register(reg('b@globex.io'));
    expect(a.user.tenantId).not.toBe(b.user.tenantId);
    expect(tenants.tenants).toHaveLength(2);
    // Both are admins of their own workspace (no shared "first user" bootstrap).
    expect(a.user.roles).toEqual(['admin', 'recruiter']);
    expect(b.user.roles).toEqual(['admin', 'recruiter']);
  });

  it('SelfServeOff_KeepsSingleTeamBootstrap', async () => {
    const { service, repo } = makeService(); // no tenantRepository/config
    const first = await service.register(reg('boss@acme.io'));
    const second = await service.register(reg('hire@acme.io'));
    expect(first.user.tenantId).toBeUndefined(); // implicit default 'team'
    expect(first.user.roles).toEqual(['admin', 'recruiter']);
    expect(second.user.roles).toEqual(['recruiter']);
    expect(repo.users.every((u) => u.tenantId === undefined)).toBe(true);
  });
});
