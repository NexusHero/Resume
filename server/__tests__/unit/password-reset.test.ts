import { PasswordResetService } from '../../src/services/password-reset-service.js';
import { ConsoleMailer } from '../../src/adapters/console-mailer.js';
import { createMailer } from '../../src/adapters/mailer-factory.js';
import { SmtpMailer } from '../../src/adapters/smtp-mailer.js';
import {
  requestResetSchema,
  confirmResetSchema,
  passwordResetUrl,
  passwordResetEmail,
} from '../../src/domain/password-reset.js';
import { UnauthorizedError } from '../../src/domain/errors.js';
import { loadConfig, type AppConfig } from '../../src/config.js';
import {
  InMemoryUserRepository,
  InMemoryPasswordResetTokenStore,
  RecordingMailer,
  fakePasswordHasher,
  noopLogger,
} from '../support/fakes.js';
import { MemorySessionStore } from '../../src/adapters/memory-session-store.js';
import type { User } from '../../src/domain/user.js';

const TS = '2026-06-30T12:00:00.000Z';
const user: User = {
  id: 'u1',
  email: 'recruiter@example.com',
  passwordHash: 'hashed:old-password',
  roles: ['recruiter'],
  createdAt: TS,
};

describe('password-reset domain', () => {
  it('Schemas_NormaliseEmailAndEnforcePasswordLength', () => {
    expect(requestResetSchema.parse({ email: '  Recruiter@Example.COM ' }).email).toBe(
      'recruiter@example.com',
    );
    expect(() => confirmResetSchema.parse({ token: 't', password: 'short' })).toThrow();
    expect(confirmResetSchema.parse({ token: 't', password: 'long-enough' })).toEqual({
      token: 't',
      password: 'long-enough',
    });
  });

  it('ResetUrl_PointsAtKitWithEncodedToken', () => {
    const url = passwordResetUrl('https://app.example/', 'a b/c');
    expect(url).toBe(
      'https://app.example/design/myjob/ui_kits/recruiting/dist/index.html?reset_token=a%20b%2Fc',
    );
  });

  it('Email_WeavesLinkAndTtl', () => {
    const { subject, text, html } = passwordResetEmail('https://app.example/reset?x=1', 45);
    expect(subject).toMatch(/reset/i);
    expect(text).toContain('https://app.example/reset?x=1');
    expect(text).toContain('45 minutes');
    expect(html).toContain('href="https://app.example/reset?x=1"');
  });
});

describe('ConsoleMailer / mailer factory', () => {
  it('ConsoleMailer_LogsInsteadOfSending', async () => {
    const calls: { meta: unknown; msg: string }[] = [];
    const logger = {
      ...noopLogger,
      info: (meta: unknown, msg: string) => calls.push({ meta, msg }),
    };
    await new ConsoleMailer({ logger }).send({
      to: 'x@example.com',
      subject: 'Hi',
      text: 'body',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.meta).toMatchObject({ to: 'x@example.com', subject: 'Hi', body: 'body' });
  });

  it('Factory_PicksConsoleByDefaultAndSmtpWhenConfigured', () => {
    const base = loadConfig({});
    expect(createMailer({ config: base, logger: noopLogger })).toBeInstanceOf(ConsoleMailer);
    const smtp: AppConfig = { ...base, mail: { ...base.mail, transport: 'smtp' } };
    expect(createMailer({ config: smtp, logger: noopLogger })).toBeInstanceOf(SmtpMailer);
  });
});

describe('PasswordResetService', () => {
  function ctx() {
    const userRepository = new InMemoryUserRepository();
    const sessionStore = new MemorySessionStore();
    const passwordResetTokenStore = new InMemoryPasswordResetTokenStore();
    const mailer = new RecordingMailer();
    const config = loadConfig({});
    const service = new PasswordResetService({
      userRepository,
      sessionStore,
      passwordResetTokenStore,
      passwordHasher: fakePasswordHasher,
      mailer,
      logger: noopLogger,
      config,
    });
    return { service, userRepository, sessionStore, passwordResetTokenStore, mailer };
  }

  it('Request_KnownEmail_MintsTokenAndEmailsLink', async () => {
    const c = ctx();
    await c.userRepository.add(user);

    await c.service.request('recruiter@example.com');

    expect(c.passwordResetTokenStore.tokens).toHaveLength(1);
    expect(c.mailer.sent).toHaveLength(1);
    expect(c.mailer.sent[0]!.to).toBe('recruiter@example.com');
    // the emailed link carries the minted token
    expect(c.mailer.sent[0]!.text).toContain(c.passwordResetTokenStore.tokens[0]!.token);
  });

  it('Request_UnknownEmail_DoesNothing_NoEnumeration', async () => {
    const c = ctx();
    await c.service.request('nobody@example.com');
    expect(c.passwordResetTokenStore.tokens).toEqual([]);
    expect(c.mailer.sent).toEqual([]);
  });

  it('Request_MailFailure_DoesNotThrow', async () => {
    const userRepository = new InMemoryUserRepository();
    await userRepository.add(user);
    const service = new PasswordResetService({
      userRepository,
      sessionStore: new MemorySessionStore(),
      passwordResetTokenStore: new InMemoryPasswordResetTokenStore(),
      passwordHasher: fakePasswordHasher,
      mailer: new RecordingMailer(new Error('smtp down')),
      logger: noopLogger,
      config: loadConfig({}),
    });
    await expect(service.request('recruiter@example.com')).resolves.toBeUndefined();
  });

  it('Confirm_ValidToken_SetsNewHashAndKillsSessions', async () => {
    const c = ctx();
    await c.userRepository.add(user);
    const liveSession = await c.sessionStore.create('u1');
    const token = await c.passwordResetTokenStore.create('u1');

    await c.service.confirm(token, 'brand-new-password');

    expect((await c.userRepository.findById('u1'))!.passwordHash).toBe('hashed:brand-new-password');
    expect(await c.sessionStore.userIdFor(liveSession)).toBeNull(); // all sessions dropped
    expect(c.passwordResetTokenStore.tokens).toEqual([]); // token consumed
  });

  it('Confirm_UnknownToken_Throws401', async () => {
    const c = ctx();
    await expect(c.service.confirm('nope', 'brand-new-password')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('Confirm_ExpiredToken_Throws401AndLeavesPassword', async () => {
    const c = ctx();
    await c.userRepository.add(user);
    const token = await c.passwordResetTokenStore.create('u1');
    c.passwordResetTokenStore.expired.add(token);

    await expect(c.service.confirm(token, 'brand-new-password')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect((await c.userRepository.findById('u1'))!.passwordHash).toBe('hashed:old-password');
  });
});
