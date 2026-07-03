import type { ArtifactLog } from '../../src/domain/artifact';
import {
  earliestPendingSince,
  matchReplies,
  normalizeAddress,
  sendOutreachSchema,
} from '../../src/domain/mail-sync';
import type { Talent } from '../../src/domain/talent';
import { loadConfig, type AppConfig } from '../../src/config';
import { MailService } from '../../src/services/mail-service';
import { createInboxSource, DisabledInboxSource } from '../../src/adapters/inbox-source-factory';
import { ImapInboxSource } from '../../src/adapters/imap-inbox-source';
import {
  FakeInboxSource,
  InMemoryArtifactLogRepository,
  InMemoryTalentRepository,
  RecordingMailer,
  noopLogger,
} from '../support/fakes';

const artifact = (over: Partial<ArtifactLog>): ArtifactLog => ({
  id: 'a1',
  ownerId: 'team',
  kind: 'outreach',
  talentId: 't1',
  provider: 'gemini',
  channel: 'email',
  audience: 'candidate',
  outcome: 'pending',
  createdAt: '2026-07-01T10:00:00.000Z',
  ...over,
});

const talent = (over: Partial<Talent>): Talent => ({
  id: 't1',
  ownerId: 'team',
  name: 'Jane Dev',
  role: 'Engineer',
  headline: '',
  location: '',
  email: 'jane@example.com',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...over,
});

describe('mail-sync domain', () => {
  it('NormalizeAddress_HandlesDisplayNamesAndCase', () => {
    expect(normalizeAddress('Jane Dev <Jane@Example.COM>')).toBe('jane@example.com');
    expect(normalizeAddress('  jane@example.com  ')).toBe('jane@example.com');
  });

  it('MatchReplies_MessageFromTalentAfterCreation_Matches', () => {
    const matches = matchReplies([artifact({})], new Map([['t1', 'jane@example.com']]), [
      {
        from: 'Jane Dev <jane@example.com>',
        receivedAt: '2026-07-02T09:00:00.000Z',
        subject: 'Re: hi',
      },
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.repliedAt).toBe('2026-07-02T09:00:00.000Z');
  });

  it('MatchReplies_EarliestReplyWins', () => {
    const matches = matchReplies([artifact({})], new Map([['t1', 'jane@example.com']]), [
      { from: 'jane@example.com', receivedAt: '2026-07-02T12:00:00.000Z', subject: 'later' },
      { from: 'jane@example.com', receivedAt: '2026-07-02T09:00:00.000Z', subject: 'first' },
    ]);
    expect(matches[0]?.repliedAt).toBe('2026-07-02T09:00:00.000Z');
  });

  it('MatchReplies_MessageBeforeOutreach_DoesNotMatch', () => {
    const matches = matchReplies(
      [artifact({ createdAt: '2026-07-03T10:00:00.000Z' })],
      new Map([['t1', 'jane@example.com']]),
      [{ from: 'jane@example.com', receivedAt: '2026-07-02T09:00:00.000Z', subject: 'old' }],
    );
    expect(matches).toEqual([]);
  });

  it('MatchReplies_OnlyPendingEmailOutreachIsEligible', () => {
    const messages = [
      { from: 'jane@example.com', receivedAt: '2026-07-02T09:00:00.000Z', subject: 'Re' },
    ];
    const emails = new Map([['t1', 'jane@example.com']]);
    expect(matchReplies([artifact({ channel: 'linkedin' })], emails, messages)).toEqual([]);
    expect(matchReplies([artifact({ kind: 'pitch', channel: '' })], emails, messages)).toEqual([]);
    expect(matchReplies([artifact({ outcome: 'replied' })], emails, messages)).toEqual([]);
  });

  it('MatchReplies_TalentWithoutAddress_IsSkippedNotGuessed', () => {
    const matches = matchReplies([artifact({})], new Map(), [
      { from: 'jane@example.com', receivedAt: '2026-07-02T09:00:00.000Z', subject: 'Re' },
    ]);
    expect(matches).toEqual([]);
  });

  it('EarliestPendingSince_PicksOldestAwaitingArtifact', () => {
    expect(
      earliestPendingSince([
        artifact({ id: 'a1', createdAt: '2026-07-02T00:00:00.000Z' }),
        artifact({ id: 'a2', createdAt: '2026-07-01T00:00:00.000Z' }),
        artifact({ id: 'a3', createdAt: '2026-06-01T00:00:00.000Z', outcome: 'replied' }),
      ]),
    ).toBe('2026-07-01T00:00:00.000Z');
    expect(earliestPendingSince([])).toBeNull();
  });

  it('SendOutreachSchema_RequiresSubjectAndBody', () => {
    expect(() => sendOutreachSchema.parse({ subject: '', body: 'hi' })).toThrow();
    expect(() => sendOutreachSchema.parse({ subject: 'Hi', body: ' ' })).toThrow();
    expect(sendOutreachSchema.parse({ subject: ' Hi ', body: 'Text' })).toEqual({
      subject: 'Hi',
      body: 'Text',
    });
  });
});

describe('MailService', () => {
  const withImap = (config: AppConfig): AppConfig => ({
    ...config,
    mail: { ...config.mail, imap: { ...config.mail.imap, host: 'imap.example.com' } },
  });

  function makeService(over: { config?: AppConfig; mailer?: RecordingMailer } = {}) {
    const talents = new InMemoryTalentRepository();
    const artifacts = new InMemoryArtifactLogRepository();
    const inbox = new FakeInboxSource();
    const mailer = over.mailer ?? new RecordingMailer();
    const service = new MailService({
      config: over.config ?? loadConfig({}),
      mailer,
      inboxSource: inbox,
      talentRepository: talents,
      artifactLogRepository: artifacts,
      logger: noopLogger,
    });
    return { service, talents, artifacts, inbox, mailer };
  }

  it('SendOutreach_DeliversToTalentAddress', async () => {
    const { service, talents, mailer } = makeService();
    await talents.add(talent({}));
    const res = await service.sendOutreach('team', 't1', { subject: 'Hi', body: 'Text' });
    expect(res).toEqual({ sent: true, to: 'jane@example.com' });
    expect(mailer.sent).toEqual([{ to: 'jane@example.com', subject: 'Hi', text: 'Text' }]);
  });

  it('SendOutreach_UnknownTalent_Throws404', async () => {
    const { service } = makeService();
    await expect(
      service.sendOutreach('team', 'ghost', { subject: 'Hi', body: 'Text' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('SendOutreach_TalentWithoutEmail_Throws400', async () => {
    const { service, talents, mailer } = makeService();
    await talents.add(talent({ email: '' }));
    await expect(
      service.sendOutreach('team', 't1', { subject: 'Hi', body: 'Text' }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mailer.sent).toEqual([]);
  });

  it('Status_ReflectsTransportAndReplySync', () => {
    const plain = makeService();
    expect(plain.service.status()).toEqual({
      sendTransport: 'console',
      replySync: false,
      pollMinutes: 15,
    });
    const imap = makeService({ config: withImap(loadConfig({})) });
    expect(imap.service.status().replySync).toBe(true);
  });

  it('SyncReplies_WithoutMailbox_Throws400', async () => {
    const { service } = makeService();
    await expect(service.syncReplies('team')).rejects.toMatchObject({ status: 400 });
  });

  it('SyncReplies_StampsRepliedWithReplyTime', async () => {
    const { service, talents, artifacts, inbox } = makeService({
      config: withImap(loadConfig({})),
    });
    await talents.add(talent({}));
    await artifacts.add(artifact({}));
    inbox.messages = [
      { from: 'Jane <jane@example.com>', receivedAt: '2026-07-02T09:00:00.000Z', subject: 'Re' },
    ];
    const res = await service.syncReplies('team');
    expect(res).toEqual({ checked: 1, messages: 1, replies: 1 });
    const updated = await artifacts.findById('team', 'a1');
    expect(updated).toMatchObject({ outcome: 'replied', outcomeAt: '2026-07-02T09:00:00.000Z' });
    // the inbox was only asked for mail since the oldest pending outreach
    expect(inbox.calls).toEqual(['2026-07-01T10:00:00.000Z']);
  });

  it('SyncReplies_NothingPending_SkipsTheMailboxEntirely', async () => {
    const { service, inbox } = makeService({ config: withImap(loadConfig({})) });
    const res = await service.syncReplies('team');
    expect(res).toEqual({ checked: 0, messages: 0, replies: 0 });
    expect(inbox.calls).toEqual([]);
  });

  it('SyncRepliesSafely_SwallowsFailures', async () => {
    const { service } = makeService(); // not configured → syncReplies throws
    await expect(service.syncRepliesSafely('team')).resolves.toBeUndefined();
  });
});

describe('createInboxSource', () => {
  it('Factory_PicksImapWhenHostConfigured_ElseDisabledEmptyInbox', async () => {
    const config = loadConfig({});
    const disabled = createInboxSource({ config });
    expect(disabled).toBeInstanceOf(DisabledInboxSource);
    await expect(disabled.listSince('2026-01-01T00:00:00.000Z')).resolves.toEqual([]);
    const imapConfig = {
      ...config,
      mail: { ...config.mail, imap: { ...config.mail.imap, host: 'imap.example.com' } },
    };
    expect(createInboxSource({ config: imapConfig })).toBeInstanceOf(ImapInboxSource);
  });
});
