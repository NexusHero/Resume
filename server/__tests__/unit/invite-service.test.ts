import { InviteService } from '../../src/services/invite-service.js';
import { loadConfig } from '../../src/config.js';
import { ConflictError, UnauthorizedError } from '../../src/domain/errors.js';
import {
  InMemoryInviteRepository,
  InMemoryUserRepository,
  RecordingMailer,
  FixedClock,
  SequenceIdGenerator,
  FakeAuthEngine,
  noopLogger,
} from '../support/fakes.js';
import type { User } from '../../src/domain/user.js';
import type { TenantInvite } from '../../src/domain/tenant-invite.js';

const NOW = '2026-06-25T10:00:00.000Z';

function ctx(mailer = new RecordingMailer()) {
  const invites = new InMemoryInviteRepository();
  const users = new InMemoryUserRepository();
  const engine = new FakeAuthEngine();
  const service = new InviteService({
    inviteRepository: invites,
    userRepository: users,
    authEngine: engine,
    idGenerator: new SequenceIdGenerator('u'),
    clock: new FixedClock(NOW),
    mailer,
    logger: noopLogger,
    config: loadConfig({}),
  });
  return { service, invites, users, engine, mailer };
}

const admin: User = {
  id: 'admin1',
  email: 'boss@acme.io',
  passwordHash: 'x',
  roles: ['admin', 'recruiter'],
  createdAt: NOW,
  tenantId: 'acme',
};

describe('InviteService.create', () => {
  it('Create_StoresInvite_MailsLink_DedupesRoles', async () => {
    const c = ctx();
    const { invite, acceptUrl } = await c.service.create('acme', admin.id, {
      email: 'new@acme.io',
      roles: ['recruiter', 'recruiter', 'admin'],
    });
    expect(c.invites.invites).toHaveLength(1);
    const stored = c.invites.invites[0]!;
    expect(stored.tenantId).toBe('acme');
    expect(stored.invitedBy).toBe('admin1');
    expect(stored.roles).toEqual(['recruiter', 'admin']); // deduped, order preserved
    // The view never leaks the token; the accept URL carries it for offline sharing.
    expect(invite).not.toHaveProperty('token');
    expect(acceptUrl).toContain(`invite_token=${stored.token}`);
    expect(c.mailer.sent[0]?.to).toBe('new@acme.io');
    expect(c.mailer.sent[0]?.text).toContain(stored.token);
  });

  it('Create_EmailAlreadyRegistered_Throws', async () => {
    const c = ctx();
    await c.users.add({ ...admin, id: 'x', email: 'taken@acme.io' });
    await expect(
      c.service.create('acme', admin.id, { email: 'taken@acme.io', roles: ['recruiter'] }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('Create_MailerFails_StillResolves', async () => {
    const c = ctx(new RecordingMailer(new Error('smtp down')));
    await expect(
      c.service.create('acme', admin.id, { email: 'new@acme.io', roles: ['recruiter'] }),
    ).resolves.toBeTruthy();
    expect(c.invites.invites).toHaveLength(1); // invite persisted despite mail failure
  });
});

describe('InviteService.list', () => {
  it('List_ReturnsTenantInvitesNewestFirst_NoTokens', async () => {
    const c = ctx();
    const mk = (email: string, tenantId: string, createdAt: string): TenantInvite => ({
      token: `tok-${email}`,
      email,
      tenantId,
      roles: ['recruiter'],
      invitedBy: 'admin1',
      createdAt,
    });
    await c.invites.create(mk('a@acme.io', 'acme', '2026-06-20T00:00:00.000Z'));
    await c.invites.create(mk('b@acme.io', 'acme', '2026-06-22T00:00:00.000Z'));
    await c.invites.create(mk('c@globex.io', 'globex', '2026-06-23T00:00:00.000Z'));
    const list = await c.service.list('acme');
    expect(list.map((i) => i.email)).toEqual(['b@acme.io', 'a@acme.io']); // newest first, acme only
    expect(list[0]).not.toHaveProperty('token');
  });
});

describe('InviteService.accept', () => {
  it('Accept_ValidToken_CreatesUserInTenantWithRoles_OpensSession_SingleUse', async () => {
    const c = ctx();
    await c.service.create('acme', admin.id, {
      email: 'new@acme.io',
      roles: ['admin', 'recruiter'],
    });
    const token = c.invites.invites[0]!.token;

    const { user, token: session } = await c.service.accept({ token, password: 'hunter2secret' });
    expect(user.email).toBe('new@acme.io');
    expect(user.roles).toEqual(['admin', 'recruiter']);
    expect(user.tenantId).toBe('acme'); // lands in the inviting tenant
    const stored = await c.users.findByEmail('new@acme.io');
    expect(stored?.tenantId).toBe('acme');
    // The engine owns the credential; the domain user keeps no password hash.
    expect(stored?.passwordHash).toBe('');
    expect((await c.engine.resolve(session))?.email).toBe('new@acme.io'); // session opened
    expect(c.invites.invites).toHaveLength(0); // single-use
  });

  it('Accept_UnknownToken_Throws401', async () => {
    const c = ctx();
    await expect(
      c.service.accept({ token: 'nope', password: 'hunter2secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('Accept_ExpiredInvite_Throws401', async () => {
    const c = ctx();
    // Older than the 7-day default TTL relative to the fixed clock.
    await c.invites.create({
      token: 'old',
      email: 'late@acme.io',
      tenantId: 'acme',
      roles: ['recruiter'],
      invitedBy: 'admin1',
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    await expect(
      c.service.accept({ token: 'old', password: 'hunter2secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    // Left in place, not consumed: an expired token can never succeed (the
    // expiry check always rejects it first), so there is nothing to clean up
    // by deleting it here — and *not* eagerly deleting is what lets a token
    // survive a genuine mid-accept failure to be retried (see the next test).
    expect(c.invites.invites).toHaveLength(1);
  });

  it('Accept_EngineSignUpFails_TokenSurvivesForRetry', async () => {
    const c = ctx();
    await c.service.create('acme', admin.id, { email: 'new@acme.io', roles: ['recruiter'] });
    const token = c.invites.invites[0]!.token;
    c.engine.signUp = async () => {
      throw new Error('credential store unavailable');
    };
    await expect(c.service.accept({ token, password: 'hunter2secret' })).rejects.toThrow(
      'credential store unavailable',
    );
    // The single-use token must not be burned by a failure that happens after
    // it was read — otherwise the invitee can never accept, even on retry.
    expect(c.invites.invites).toHaveLength(1);
    expect(await c.users.findByEmail('new@acme.io')).toBeNull();
  });

  it('Accept_EmailRegisteredMeanwhile_Throws', async () => {
    const c = ctx();
    await c.service.create('acme', admin.id, { email: 'new@acme.io', roles: ['recruiter'] });
    const token = c.invites.invites[0]!.token;
    await c.users.add({ ...admin, id: 'sneaky', email: 'new@acme.io', tenantId: 'other' });
    await expect(c.service.accept({ token, password: 'hunter2secret' })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
