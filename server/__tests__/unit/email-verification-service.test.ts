import { EmailVerificationService } from '../../src/services/email-verification-service';
import { loadConfig } from '../../src/config';
import { UnauthorizedError } from '../../src/domain/errors';
import {
  InMemoryUserRepository,
  InMemoryEmailVerificationTokenStore,
  RecordingMailer,
  FixedClock,
  noopLogger,
} from '../support/fakes';
import type { User } from '../../src/domain/user';

const user: User = {
  id: 'user1',
  email: 'nora@example.de',
  passwordHash: 'x',
  roles: ['recruiter'],
  createdAt: '2026-06-25T10:00:00.000Z',
};

function ctx(mailer = new RecordingMailer()) {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryEmailVerificationTokenStore();
  const service = new EmailVerificationService({
    userRepository: users,
    emailVerificationTokenStore: tokens,
    mailer,
    logger: noopLogger,
    clock: new FixedClock(),
    config: loadConfig({}),
  });
  return { service, users, tokens, mailer };
}

describe('EmailVerificationService', () => {
  it('Send_MintsTokenAndMailsTheLink', async () => {
    const c = ctx();
    await c.users.add(user);
    await c.service.send(user);
    expect(c.tokens.tokens).toHaveLength(1);
    expect(c.mailer.sent).toHaveLength(1);
    expect(c.mailer.sent[0]?.to).toBe('nora@example.de');
    expect(c.mailer.sent[0]?.text).toContain(`verify_token=${c.tokens.tokens[0]?.token}`);
  });

  it('Send_MailerFails_ResolvesAnyway', async () => {
    const c = ctx(new RecordingMailer(new Error('smtp down')));
    await c.users.add(user);
    await expect(c.service.send(user)).resolves.toBeUndefined();
  });

  it('Confirm_ValidToken_StampsVerifiedAtAndConsumesTokens', async () => {
    const c = ctx();
    await c.users.add(user);
    await c.service.send(user);
    await c.service.send(user); // a second outstanding link
    const token = c.tokens.tokens[0]!.token;
    await c.service.confirm(token);
    expect((await c.users.findById('user1'))?.verifiedAt).toBe('2026-06-25T10:00:00.000Z');
    expect(c.tokens.tokens).toHaveLength(0); // both links consumed/destroyed
  });

  it('Confirm_UnknownToken_ThrowsUnauthorized', async () => {
    const c = ctx();
    await expect(c.service.confirm('nope')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
