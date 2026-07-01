import {
  estimateCost,
  summarizeUsage,
  toUsageEvent,
  type UsageEvent,
} from '../../src/domain/usage';
import { UsageService } from '../../src/services/usage-service';
import { InMemoryUsageMeter } from '../support/fakes';

const ev = (over: Partial<UsageEvent> = {}): UsageEvent => ({
  ownerId: 'u1',
  provider: 'claude',
  feature: 'ats',
  inputTokens: 1000,
  outputTokens: 500,
  at: '2026-07-01T10:00:00.000Z',
  ...over,
});

describe('usage domain', () => {
  describe('estimateCost', () => {
    it('PricesClaudeInputAndOutputPerMillion', () => {
      // 1M input @ $3 + 1M output @ $15 = $18
      expect(estimateCost('claude', 1_000_000, 1_000_000)).toBeCloseTo(18, 5);
    });

    it('PricesGeminiCheaperThanClaude', () => {
      expect(estimateCost('gemini', 1_000_000, 0)).toBeCloseTo(0.3, 5);
    });

    it('UnknownProvider_CostsZero', () => {
      // a provider added to the type but not the price table must not throw
      expect(estimateCost('openai' as never, 1_000_000, 1_000_000)).toBe(0);
    });
  });

  describe('summarizeUsage', () => {
    it('EmptyEvents_ZeroesEverything', () => {
      const s = summarizeUsage([]);
      expect(s).toMatchObject({ requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 });
      expect(s.costUsd).toBe(0);
      expect(s.byProvider).toEqual([]);
      expect(s.byFeature).toEqual([]);
    });

    it('AggregatesTotalsAndBreakdowns', () => {
      const s = summarizeUsage([
        ev({ provider: 'claude', feature: 'ats', inputTokens: 1000, outputTokens: 500 }),
        ev({ provider: 'claude', feature: 'pitch', inputTokens: 2000, outputTokens: 1000 }),
        ev({ provider: 'gemini', feature: 'ats', inputTokens: 4000, outputTokens: 0 }),
      ]);
      expect(s.requests).toBe(3);
      expect(s.inputTokens).toBe(7000);
      expect(s.outputTokens).toBe(1500);
      expect(s.totalTokens).toBe(8500);
      // provider breakdown, sorted by total tokens desc: gemini(4000) vs claude(4500)
      expect(s.byProvider.map((p) => p.provider)).toEqual(['claude', 'gemini']);
      const claude = s.byProvider.find((p) => p.provider === 'claude')!;
      expect(claude).toMatchObject({ requests: 2, inputTokens: 3000, outputTokens: 1500 });
      // feature breakdown groups the two ats calls
      const ats = s.byFeature.find((f) => f.feature === 'ats')!;
      expect(ats).toMatchObject({ requests: 2, inputTokens: 5000, outputTokens: 500 });
    });

    it('RoundsCostToFourDecimals', () => {
      const s = summarizeUsage([ev({ inputTokens: 333, outputTokens: 111 })]);
      // no long float tails
      expect(Number.isFinite(s.costUsd)).toBe(true);
      expect(s.costUsd).toBe(Math.round(s.costUsd * 10_000) / 10_000);
    });
  });

  describe('toUsageEvent', () => {
    it('BuildsEventFromTokenUsage', () => {
      const e = toUsageEvent(
        'u9',
        'gemini',
        'outreach',
        { inputTokens: 12, outputTokens: 34 },
        'T',
      );
      expect(e).toEqual({
        ownerId: 'u9',
        provider: 'gemini',
        feature: 'outreach',
        inputTokens: 12,
        outputTokens: 34,
        at: 'T',
      });
    });
  });
});

describe('UsageService', () => {
  it('SummaryFor_ReadsOnlyTheGivenUsersEvents', async () => {
    const meter = new InMemoryUsageMeter();
    await meter.record(ev({ ownerId: 'u1', inputTokens: 100, outputTokens: 50 }));
    await meter.record(ev({ ownerId: 'other', inputTokens: 999, outputTokens: 999 }));
    const svc = new UsageService({ usageMeter: meter });
    const summary = await svc.summaryFor('u1');
    expect(summary.requests).toBe(1);
    expect(summary.inputTokens).toBe(100);
  });
});
