import { z } from 'zod';
import type { ArtifactLog } from './artifact.js';

/**
 * Automatic reply detection for the outcome loop (ADR-0015): outreach sent by
 * email can be resolved without manual stamping by watching the desk's inbox.
 * A pending email outreach counts as `replied` once a message from the
 * talent's address arrives after the outreach was generated. The matching is
 * pure and testable; talking to a real mailbox lives behind the InboxSource
 * port.
 */

/** POST /api/v1/talents/:id/outreach/send */
export const sendOutreachSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  body: z.string().trim().min(1, 'Body is required').max(20_000),
});
export type SendOutreachInput = z.infer<typeof sendOutreachSchema>;

/** The little an inbox message needs to reveal for reply matching. */
export interface InboxMessage {
  /** Sender, either a bare address or `Name <address>`. */
  from: string;
  /** When the message arrived (ISO 8601). */
  receivedAt: string;
  subject: string;
}

/** A pending artifact matched to the inbox message that resolves it. */
export interface ReplyMatch {
  artifact: ArtifactLog;
  /** When the reply arrived — becomes the artifact's `outcomeAt`. */
  repliedAt: string;
}

/** Lowercased bare address: `Jane Doe <Jane@X.dev>` → `jane@x.dev`. */
export function normalizeAddress(raw: string): string {
  const angled = /<([^<>]+)>/.exec(raw);
  return (angled?.[1] ?? raw).trim().toLowerCase();
}

/** Only these artifacts can be auto-resolved by inbox mail. */
export function isAwaitingEmailReply(log: ArtifactLog): boolean {
  return log.kind === 'outreach' && log.channel === 'email' && log.outcome === 'pending';
}

/**
 * Match pending email outreach to inbox messages. A reply counts when a
 * message from the talent's address arrived at or after the artifact was
 * created; the earliest such message wins. Talents without a known address
 * are skipped — never guessed.
 */
export function matchReplies(
  artifacts: ArtifactLog[],
  emailByTalentId: Map<string, string>,
  messages: InboxMessage[],
): ReplyMatch[] {
  const matches: ReplyMatch[] = [];
  for (const artifact of artifacts) {
    if (!isAwaitingEmailReply(artifact)) continue;
    const address = emailByTalentId.get(artifact.talentId)?.trim().toLowerCase();
    if (!address) continue;
    const replies = messages
      .filter((m) => normalizeAddress(m.from) === address && m.receivedAt >= artifact.createdAt)
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
    const first = replies[0];
    if (first) matches.push({ artifact, repliedAt: first.receivedAt });
  }
  return matches;
}

/** The oldest `createdAt` among artifacts still awaiting a reply — bounds the inbox query. */
export function earliestPendingSince(artifacts: ArtifactLog[]): string | null {
  const pending = artifacts.filter(isAwaitingEmailReply);
  if (pending.length === 0) return null;
  return pending.reduce((min, a) => (a.createdAt < min ? a.createdAt : min), pending[0]!.createdAt);
}
