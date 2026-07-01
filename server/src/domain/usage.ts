import type { LlmProviderId, TokenUsage } from '../ports/llm-provider';

/** The AI features whose token spend we meter, one per user-facing action. */
export const USAGE_FEATURES = [
  'suggest', // rewrite résumé summary / draft cover-letter paragraphs
  'parse', // parse a pasted or uploaded CV into structured fields
  'ats', // score a résumé against a job ad
  'pitch', // draft a candidate pitch for a mandate
  'outreach', // draft a first-contact message
  'coverLetter', // generate a tailored Anschreiben
  'matchExplain', // explain why a candidate fits a mandate
] as const;
export type UsageFeature = (typeof USAGE_FEATURES)[number];

/** One metered LLM call: who made it, which provider/feature, and what it cost. */
export interface UsageEvent {
  ownerId: string; // the user whose key/quota it counts against
  provider: LlmProviderId;
  feature: UsageFeature;
  inputTokens: number;
  outputTokens: number;
  at: string; // ISO 8601
}

/**
 * Public list prices in USD per 1M tokens (input, output), used only to give the
 * recruiter a rough cost figure — not billing. Kept here so the number has one
 * source of truth; update alongside provider pricing changes.
 */
export const USAGE_PRICING: Record<LlmProviderId, { input: number; output: number }> = {
  claude: { input: 3, output: 15 },
  gemini: { input: 0.3, output: 2.5 },
};

/** Rough USD cost of a token count for a provider (0 for an unknown provider). */
export function estimateCost(
  provider: LlmProviderId,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = USAGE_PRICING[provider];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

/** Round a USD amount to whole cents, avoiding float dust in the API payload. */
function roundCost(usd: number): number {
  return Math.round(usd * 10_000) / 10_000;
}

interface Bucket {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface UsageBreakdown extends Bucket {
  totalTokens: number;
}
export interface ProviderUsage extends UsageBreakdown {
  provider: LlmProviderId;
}
export interface FeatureUsage extends UsageBreakdown {
  feature: UsageFeature;
}

/** The per-user usage summary the settings endpoint returns. */
export interface UsageSummary extends UsageBreakdown {
  byProvider: ProviderUsage[];
  byFeature: FeatureUsage[];
}

const emptyBucket = (): Bucket => ({ requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 });

function addTo(bucket: Bucket, event: UsageEvent): void {
  bucket.requests += 1;
  bucket.inputTokens += event.inputTokens;
  bucket.outputTokens += event.outputTokens;
  bucket.costUsd += estimateCost(event.provider, event.inputTokens, event.outputTokens);
}

function finish<T extends object>(key: T, bucket: Bucket): T & UsageBreakdown {
  return {
    ...key,
    requests: bucket.requests,
    inputTokens: bucket.inputTokens,
    outputTokens: bucket.outputTokens,
    totalTokens: bucket.inputTokens + bucket.outputTokens,
    costUsd: roundCost(bucket.costUsd),
  };
}

/** Aggregate a user's metered events into totals plus per-provider/feature breakdowns. */
export function summarizeUsage(events: UsageEvent[]): UsageSummary {
  const total = emptyBucket();
  const byProvider = new Map<LlmProviderId, Bucket>();
  const byFeature = new Map<UsageFeature, Bucket>();

  for (const e of events) {
    addTo(total, e);
    const pb = byProvider.get(e.provider) ?? emptyBucket();
    addTo(pb, e);
    byProvider.set(e.provider, pb);
    const fb = byFeature.get(e.feature) ?? emptyBucket();
    addTo(fb, e);
    byFeature.set(e.feature, fb);
  }

  return {
    ...finish({}, total),
    byProvider: [...byProvider.entries()]
      .map(([provider, b]) => finish({ provider }, b))
      .sort((a, b) => b.totalTokens - a.totalTokens),
    byFeature: [...byFeature.entries()]
      .map(([feature, b]) => finish({ feature }, b))
      .sort((a, b) => b.totalTokens - a.totalTokens),
  };
}

/** Construct a usage event from a completed generation's token usage. */
export function toUsageEvent(
  ownerId: string,
  provider: LlmProviderId,
  feature: UsageFeature,
  usage: TokenUsage,
  at: string,
): UsageEvent {
  return {
    ownerId,
    provider,
    feature,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    at,
  };
}
