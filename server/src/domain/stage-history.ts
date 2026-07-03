import type { CandidacyStage } from './candidacy';

/**
 * The prediction flywheel (ADR-0016): every pipeline stage change is logged,
 * and once enough of the desk's own candidacies have resolved, the revenue
 * forecast swaps its industry-typical stage probabilities for the observed
 * ones — per desk, transparently, and never on thin data.
 */

/** One pipeline move. `from: null` marks the talent entering the pipeline. */
export interface StageTransition {
  id: string;
  ownerId: string; // team scope
  candidacyId: string;
  mandateId: string;
  talentId: string;
  from: CandidacyStage | null;
  to: CandidacyStage;
  at: string; // ISO 8601
}

/** Stages a candidacy can still be worked from (terminal ones excluded). */
export const OPEN_STAGES = ['sourced', 'screening', 'interview', 'offer'] as const;
export type OpenStage = (typeof OPEN_STAGES)[number];

/** Observed probabilities need at least this many resolved journeys per stage. */
export const MIN_SAMPLE = 5;

/** Clients need at least this many resolved interview journeys to be reported. */
export const MIN_CLIENT_INTERVIEWS = 3;

/** How a stage's win probability was determined — shown to the user, never hidden. */
export interface StageProbability {
  stage: OpenStage;
  probability: number; // 0–1, rounded to 2 decimals
  source: 'observed' | 'default';
  /** Resolved journeys that passed through this stage. */
  sample: number;
  /** …of which ended in a placement. */
  wins: number;
}

/** Per-client interview conversion — where interviews win and where they stall. */
export interface ClientInsight {
  client: string;
  /** Resolved journeys that reached an interview with this client. */
  interviews: number;
  placements: number;
  rate: number; // percent
}

interface Journey {
  mandateId: string;
  visited: Set<CandidacyStage>;
}

/** One journey per candidacy: every stage it touched, in either direction. */
function buildJourneys(transitions: StageTransition[]): Map<string, Journey> {
  const journeys = new Map<string, Journey>();
  for (const t of transitions) {
    let j = journeys.get(t.candidacyId);
    if (!j) {
      j = { mandateId: t.mandateId, visited: new Set() };
      journeys.set(t.candidacyId, j);
    }
    if (t.from) j.visited.add(t.from);
    j.visited.add(t.to);
  }
  return journeys;
}

/** `placed` outranks `rejected` (a post-placement rejection is a data hiccup, not a loss). */
function outcome(j: Journey): 'placed' | 'rejected' | 'open' {
  if (j.visited.has('placed')) return 'placed';
  if (j.visited.has('rejected')) return 'rejected';
  return 'open';
}

/**
 * Learn each open stage's win probability from the desk's resolved journeys:
 * of the candidacies that passed through the stage and have since resolved,
 * how many ended placed? Below MIN_SAMPLE the industry default stays — a
 * forecast must never swing on two data points. Open journeys never count.
 */
export function learnStageProbabilities(
  transitions: StageTransition[],
  defaults: Record<CandidacyStage, number>,
): StageProbability[] {
  const journeys = [...buildJourneys(transitions).values()]
    .map((j) => ({ ...j, outcome: outcome(j) }))
    .filter((j) => j.outcome !== 'open');
  return OPEN_STAGES.map((stage) => {
    const through = journeys.filter((j) => j.visited.has(stage));
    const wins = through.filter((j) => j.outcome === 'placed').length;
    const observed = through.length >= MIN_SAMPLE;
    return {
      stage,
      probability: observed ? Math.round((wins / through.length) * 100) / 100 : defaults[stage],
      source: observed ? ('observed' as const) : ('default' as const),
      sample: through.length,
      wins,
    };
  });
}

/** The learned curve as a lookup the forecast can consume (terminals fixed). */
export function winProbabilityFrom(learned: StageProbability[]): Record<CandidacyStage, number> {
  const record = { placed: 1, rejected: 0 } as Record<CandidacyStage, number>;
  for (const p of learned) record[p.stage] = p.probability;
  return record;
}

/**
 * Interview intelligence: per client, how often a resolved interview turned
 * into a placement. Only clients with MIN_CLIENT_INTERVIEWS resolved
 * interview journeys appear — busiest first, ties by conversion.
 */
export function clientInsights(
  transitions: StageTransition[],
  clientByMandateId: Map<string, string>,
): ClientInsight[] {
  const byClient = new Map<string, { interviews: number; placements: number }>();
  for (const j of buildJourneys(transitions).values()) {
    const fate = outcome(j);
    if (fate === 'open' || !j.visited.has('interview')) continue;
    const client = clientByMandateId.get(j.mandateId);
    if (!client) continue;
    const row = byClient.get(client) ?? { interviews: 0, placements: 0 };
    row.interviews += 1;
    if (fate === 'placed') row.placements += 1;
    byClient.set(client, row);
  }
  return [...byClient.entries()]
    .filter(([, r]) => r.interviews >= MIN_CLIENT_INTERVIEWS)
    .map(([client, r]) => ({
      client,
      interviews: r.interviews,
      placements: r.placements,
      rate: Math.round((r.placements / r.interviews) * 100),
    }))
    .sort((a, b) => b.interviews - a.interviews || b.rate - a.rate);
}
