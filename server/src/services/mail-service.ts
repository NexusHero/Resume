import type { AppConfig } from '../config.js';
import { NotFoundError, ValidationError } from '../domain/errors.js';
import {
  earliestPendingSince,
  isAwaitingEmailReply,
  matchReplies,
  type SendOutreachInput,
} from '../domain/mail-sync.js';
import type { ArtifactLogRepository } from '../ports/artifact-log-repository.js';
import type { InboxSource } from '../ports/inbox-source.js';
import type { Logger } from '../ports/logger.js';
import type { Mailer } from '../ports/mailer.js';
import type { TalentRepository } from '../ports/talent-repository.js';

/** What the send endpoint reports back. */
export interface SendOutreachResult {
  sent: true;
  to: string;
}

/** One reply-sync pass, summarized. */
export interface SyncRepliesResult {
  /** Pending email outreach considered. */
  checked: number;
  /** Inbox messages inspected. */
  messages: number;
  /** Artifacts stamped `replied` this pass. */
  replies: number;
}

/** What the UI needs to know about the mail wiring. */
export interface MailStatus {
  /** `smtp` delivers for real; `console` logs (dev). Sending works either way. */
  sendTransport: 'console' | 'smtp';
  /** Whether an IMAP mailbox is configured, i.e. replies resolve themselves. */
  replySync: boolean;
  /** Server-side poll interval when replySync is on. */
  pollMinutes: number;
}

/**
 * The email integration (ADR-0015): send drafted outreach from the app and
 * close the outcome loop automatically by matching inbox mail to pending
 * email outreach. Message bodies are never stored — sending passes text
 * through to the mailer, and reply sync only reads envelopes.
 */
export class MailService {
  private readonly config: AppConfig;
  private readonly mailer: Mailer;
  private readonly inboxSource: InboxSource;
  private readonly talents: TalentRepository;
  private readonly artifacts: ArtifactLogRepository;
  private readonly logger: Logger;

  constructor(deps: {
    config: AppConfig;
    mailer: Mailer;
    inboxSource: InboxSource;
    talentRepository: TalentRepository;
    artifactLogRepository: ArtifactLogRepository;
    logger: Logger;
  }) {
    this.config = deps.config;
    this.mailer = deps.mailer;
    this.inboxSource = deps.inboxSource;
    this.talents = deps.talentRepository;
    this.artifacts = deps.artifactLogRepository;
    this.logger = deps.logger;
  }

  /** Send a drafted outreach email to the talent's stored address. */
  async sendOutreach(
    scope: string,
    talentId: string,
    input: SendOutreachInput,
  ): Promise<SendOutreachResult> {
    const talent = await this.talents.findById(scope, talentId);
    if (!talent) throw new NotFoundError(`Talent ${talentId} not found`);
    const to = talent.email.trim();
    if (!to) {
      throw new ValidationError(
        'This talent has no email address — add one to their profile first',
      );
    }
    await this.mailer.send({ to, subject: input.subject, text: input.body });
    return { sent: true, to };
  }

  /** Whether reply sync is configured (drives the scheduler and the UI). */
  get replySyncEnabled(): boolean {
    return Boolean(this.config.mail.imap.host);
  }

  status(): MailStatus {
    return {
      sendTransport: this.config.mail.transport,
      replySync: this.replySyncEnabled,
      pollMinutes: this.config.mail.imap.pollMinutes,
    };
  }

  /**
   * One reply-detection pass: fetch inbox mail since the oldest pending email
   * outreach and stamp every artifact whose talent has since written back.
   */
  async syncReplies(scope: string): Promise<SyncRepliesResult> {
    if (!this.replySyncEnabled) {
      throw new ValidationError('No IMAP mailbox is configured (set MAIL_IMAP_HOST)');
    }
    const all = await this.artifacts.list(scope);
    const since = earliestPendingSince(all);
    if (!since) return { checked: 0, messages: 0, replies: 0 };

    const pending = all.filter(isAwaitingEmailReply);
    const messages = await this.inboxSource.listSince(since);
    const emailByTalentId = new Map(
      (await this.talents.list(scope)).filter((t) => t.email).map((t) => [t.id, t.email]),
    );
    const matches = matchReplies(pending, emailByTalentId, messages);
    for (const match of matches) {
      await this.artifacts.update({
        ...match.artifact,
        outcome: 'replied',
        outcomeAt: match.repliedAt,
      });
    }
    if (matches.length > 0) {
      this.logger.info({ replies: matches.length }, 'reply sync stamped outreach as replied');
    }
    return { checked: pending.length, messages: messages.length, replies: matches.length };
  }

  /** Scheduler entry point: a failing poll must never take the server down. */
  async syncRepliesSafely(scope: string): Promise<void> {
    try {
      await this.syncReplies(scope);
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'scheduled reply sync failed',
      );
    }
  }
}
