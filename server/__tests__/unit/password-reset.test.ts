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
  FakeAuthEngine,
  noopLogger,
} from '../support/fakes.js';
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
    const authEngine = new FakeAuthEngine();
    const passwordResetTokenStore = new InMemoryPasswordResetTokenStore();
    const mailer = new RecordingMailer();
    const config = loadConfig({});
    const service = new PasswordResetService({
      userRepository,
      authEngine,
      passwordResetTokenStore,
      mailer,
      logger: noopLogger,
      config,
    });
    return { service, userRepository, authEngine, passwordResetTokenStore, mailer };
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
      authEngine: new FakeAuthEngine(),
      passwordResetTokenStore: new InMemoryPasswordResetTokenStore(),
      mailer: new RecordingMailer(new Error('smtp down')),
      logger: noopLogger,
      config: loadConfig({}),
    });
    await expect(service.request('recruiter@example.com')).resolves.toBeUndefined();
  });

  it('Confirm_ValidToken_SetsNewEnginePassword_KillsSessions_ClearsLegacyHash', async () => {
    const c = ctx();
    await c.userRepository.add(user);
    // A migrated account: the engine already holds the credential and a live session.
    await c.authEngine.signUp('recruiter@example.com', 'old-password');
    const live = (await c.authEngine.signIn('recruiter@example.com', 'old-password'))!;
    const token = await c.passwordResetTokenStore.create('u1');

    await c.service.confirm(token, 'brand-new-password');

    // The new password lives in the engine; the legacy hash is cleared (ADR-0043).
    expect((await c.userRepository.findById('u1'))!.passwordHash).toBe('');
    expect(await c.authEngine.signIn('recruiter@example.com', 'brand-new-password')).not.toBeNull();
    expect(await c.authEngine.resolve(live.token)).toBeNull(); // all sessions dropped
    expect(c.passwordResetTokenStore.tokens).toEqual([]); // token consumed
  });

  it('Confirm_UnmigratedAccount_MintsEngineCredential', async () => {
    // An account that predates Better-Auth has no engine credential yet; confirm
    // must create one with the new password rather than fail.
    const c = ctx();
    await c.userRepository.add(user);
    const token = await c.passwordResetTokenStore.create('u1');

    await c.service.confirm(token, 'brand-new-password');

    expect((await c.userRepository.findById('u1'))!.passwordHash).toBe('');
    expect(await c.authEngine.signIn('recruiter@example.com', 'brand-new-password')).not.toBeNull();
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
