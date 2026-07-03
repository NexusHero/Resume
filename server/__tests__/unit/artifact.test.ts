import { summarizeArtifacts, type ArtifactLog } from '../../src/domain/artifact';

const log = (over: Partial<ArtifactLog>): ArtifactLog => ({
  id: 'a1',
  ownerId: 'team',
  kind: 'outreach',
  talentId: 't1',
  provider: 'gemini',
  channel: 'email',
  audience: 'candidate',
  outcome: 'pending',
  createdAt: '2026-07-03T10:00:00.000Z',
  ...over,
});

describe('artifact domain', () => {
  it('Summarize_Empty_YieldsNoBuckets', () => {
    expect(summarizeArtifacts([])).toEqual({ byKind: [], byProvider: [], byChannel: [] });
  });

  it('Summarize_CountsOutcomesAndComputesReplyRate', () => {
    const stats = summarizeArtifacts([
      log({ id: 'a1', outcome: 'replied' }),
      log({ id: 'a2', outcome: 'no-reply' }),
      log({ id: 'a3', outcome: 'converted' }),
      log({ id: 'a4', outcome: 'pending' }),
    ]);
    const outreach = stats.byKind.find((b) => b.kind === 'outreach');
    // 2 of 3 resolved artifacts got a reply or converted → 67%
    expect(outreach).toMatchObject({
      sent: 4,
      replied: 1,
      noReply: 1,
      converted: 1,
      pending: 1,
      replyRate: 67,
    });
  });

  it('Summarize_NothingResolved_ReplyRateIsNullNotZero', () => {
    const stats = summarizeArtifacts([log({ id: 'a1' }), log({ id: 'a2' })]);
    expect(stats.byKind[0]?.replyRate).toBeNull();
  });

  it('Summarize_SplitsByProviderPerKind', () => {
    const stats = summarizeArtifacts([
      log({ id: 'a1', provider: 'gemini', outcome: 'replied' }),
      log({ id: 'a2', provider: 'template', outcome: 'no-reply' }),
    ]);
    // Comparing template vs AI hit rates is the point of the loop.
    expect(stats.byProvider.find((b) => b.provider === 'gemini')?.replyRate).toBe(100);
    expect(stats.byProvider.find((b) => b.provider === 'template')?.replyRate).toBe(0);
  });

  it('Summarize_PitchesWithoutChannel_DoNotPolluteChannelStats', () => {
    const stats = summarizeArtifacts([
      log({ id: 'a1', kind: 'pitch', channel: '', audience: '' }),
      log({ id: 'a2', channel: 'linkedin' }),
    ]);
    expect(stats.byChannel.map((b) => b.channel)).toEqual(['linkedin']);
  });
});
