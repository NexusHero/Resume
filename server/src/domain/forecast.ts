import type { Mandate } from './mandate';
import type { Candidacy, CandidacyStage } from './candidacy';

/**
 * Weighted pipeline forecast — the agency-economics view. Each open candidacy
 * carries a stage-based probability of ending in a placement; a mandate is
 * filled at most once, so its expected fee is the fee value times the
 * probability that *at least one* of its candidates converts. Summed across
 * mandates this gives an expected-revenue figure the recruiter can commit to.
 *
 * Deterministic and offline: the probabilities are a fixed, industry-typical
 * curve, not a learned model, so the number is transparent and reproducible.
 */
export const STAGE_WIN_PROBABILITY: Record<CandidacyStage, number> = {
  sourced: 0.05,
  screening: 0.15,
  interview: 0.4,
  offer: 0.7,
  placed: 1,
  rejected: 0,
};

/** "17.160 €" → 17160 (digits only; German thousands dots dropped). */
export function parseFeeValue(s: string): number {
  return parseInt(String(s == null ? '' : s).replace(/[^0-9]/g, ''), 10) || 0;
}

export interface MandateForecast {
  mandateId: string;
  client: string;
  role: string;
  feeValue: number; // parsed euro amount
  probability: number; // 0–1, chance the mandate gets filled
  weightedValue: number; // feeValue × probability, rounded to whole euros
  candidacies: number; // how many talents are in this mandate's pipeline
  topStage: CandidacyStage | null; // the furthest-advanced candidate's stage
}

export interface PipelineForecast {
  totalWeighted: number; // Σ weightedValue
  totalFaceValue: number; // Σ feeValue of mandates with any candidacy
  mandates: MandateForecast[]; // only mandates with ≥1 candidacy, best first
}

/** Probability a mandate gets filled: 1 − Π(1 − p) over its candidacies. */
function fillProbability(
  candidacies: Candidacy[],
  winProbability: Record<CandidacyStage, number>,
): number {
  const missAll = candidacies.reduce((acc, c) => acc * (1 - (winProbability[c.stage] ?? 0)), 1);
  return 1 - missAll;
}

/** The furthest-advanced stage among a mandate's candidacies (by win probability). */
function topStage(
  candidacies: Candidacy[],
  winProbability: Record<CandidacyStage, number>,
): CandidacyStage | null {
  let best: CandidacyStage | null = null;
  let bestP = -1;
  for (const c of candidacies) {
    const p = winProbability[c.stage] ?? 0;
    if (p > bestP) {
      bestP = p;
      best = c.stage;
    }
  }
  return best;
}

/**
 * Build the weighted forecast from the (non-closed) mandates and their
 * candidacies. Mandates with no candidacy are omitted — they carry no pipeline.
 * The stage curve defaults to the industry-typical one; Forecast v2 passes the
 * desk's learned probabilities instead (ADR-0016).
 */
export function forecastPipeline(
  mandates: Mandate[],
  candidaciesByMandate: Map<string, Candidacy[]>,
  winProbability: Record<CandidacyStage, number> = STAGE_WIN_PROBABILITY,
): PipelineForecast {
  const rows: MandateForecast[] = [];
  let totalWeighted = 0;
  let totalFaceValue = 0;

  for (const m of mandates) {
    const candidacies = candidaciesByMandate.get(m.id) ?? [];
    if (candidacies.length === 0) continue;
    const feeValue = parseFeeValue(m.feeValue);
    const probability = fillProbability(candidacies, winProbability);
    const weightedValue = Math.round(feeValue * probability);
    totalWeighted += weightedValue;
    totalFaceValue += feeValue;
    rows.push({
      mandateId: m.id,
      client: m.client,
      role: m.role,
      feeValue,
      probability: Math.round(probability * 100) / 100,
      weightedValue,
      candidacies: candidacies.length,
      topStage: topStage(candidacies, winProbability),
    });
  }

  rows.sort((a, b) => b.weightedValue - a.weightedValue || a.client.localeCompare(b.client));
  return { totalWeighted, totalFaceValue, mandates: rows };
}
