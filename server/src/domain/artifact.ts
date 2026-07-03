import { z } from 'zod';

/**
 * The outcome loop: every client-facing AI artifact (outreach message,
 * candidate pitch) is logged when it is generated and later stamped with what
 * actually happened. Over time this yields the one dataset no model provider
 * has — which drafts, channels and tones get replies for THIS desk — and it
 * feeds honest statistics back to the point of use (ADR-0014).
 */

export const ARTIFACT_KINDS = ['outreach', 'pitch'] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const ARTIFACT_OUTCOMES = ['pending', 'replied', 'no-reply', 'converted'] as const;
export type ArtifactOutcome = (typeof ARTIFACT_OUTCOMES)[number];

/** One generated artifact and its fate. */
export interface ArtifactLog {
  id: string;
  ownerId: string; // team scope
  kind: ArtifactKind;
  talentId: string;
  /** Which backend produced it — comparing template vs AI reply rates is the point. */
  provider: string;
  /** Outreach context (empty for pitches). */
  channel: string; // 'email' | 'linkedin' | ''
  audience: string; // 'candidate' | 'client' | ''
  outcome: ArtifactOutcome;
  createdAt: string; // ISO 8601
  outcomeAt?: string;
}

/** POST /api/v1/artifacts/:id/outcome */
export const setOutcomeSchema = z.object({
  outcome: z.enum(ARTIFACT_OUTCOMES),
});
export type SetOutcomeInput = z.infer<typeof setOutcomeSchema>;

export interface ArtifactBucket {
  sent: number;
  replied: number;
  noReply: number;
  converted: number;
  pending: number;
  /** replied + converted over everything with a known fate; null while nothing is resolved. */
  replyRate: number | null;
}

export interface ArtifactStats {
  byKind: Array<{ kind: ArtifactKind } & ArtifactBucket>;
  byProvider: Array<{ kind: ArtifactKind; provider: string } & ArtifactBucket>;
  byChannel: Array<{ channel: string } & ArtifactBucket>;
}

const emptyBucket = (): Omit<ArtifactBucket, 'replyRate'> => ({
  sent: 0,
  replied: 0,
  noReply: 0,
  converted: 0,
  pending: 0,
});

function addTo(bucket: Omit<ArtifactBucket, 'replyRate'>, log: ArtifactLog): void {
  bucket.sent += 1;
  if (log.outcome === 'replied') bucket.replied += 1;
  else if (log.outcome === 'no-reply') bucket.noReply += 1;
  else if (log.outcome === 'converted') bucket.converted += 1;
  else bucket.pending += 1;
}

function finish<T extends object>(
  key: T,
  b: Omit<ArtifactBucket, 'replyRate'>,
): T & ArtifactBucket {
  const resolved = b.replied + b.noReply + b.converted;
  const replyRate =
    resolved === 0 ? null : Math.round(((b.replied + b.converted) / resolved) * 100);
  return { ...key, ...b, replyRate };
}

/** Aggregate the log into the desk's honest hit rates. */
export function summarizeArtifacts(logs: ArtifactLog[]): ArtifactStats {
  const byKind = new Map<string, Omit<ArtifactBucket, 'replyRate'>>();
  const byProvider = new Map<string, Omit<ArtifactBucket, 'replyRate'>>();
  const byChannel = new Map<string, Omit<ArtifactBucket, 'replyRate'>>();
  for (const log of logs) {
    const k = byKind.get(log.kind) ?? emptyBucket();
    addTo(k, log);
    byKind.set(log.kind, k);
    const pKey = `${log.kind}|${log.provider}`;
    const p = byProvider.get(pKey) ?? emptyBucket();
    addTo(p, log);
    byProvider.set(pKey, p);
    if (log.channel) {
      const c = byChannel.get(log.channel) ?? emptyBucket();
      addTo(c, log);
      byChannel.set(log.channel, c);
    }
  }
  return {
    byKind: [...byKind.entries()].map(([kind, b]) => finish({ kind: kind as ArtifactKind }, b)),
    byProvider: [...byProvider.entries()].map(([key, b]) => {
      const [kind, provider] = key.split('|');
      return finish({ kind: kind as ArtifactKind, provider: provider ?? '' }, b);
    }),
    byChannel: [...byChannel.entries()].map(([channel, b]) => finish({ channel }, b)),
  };
}
