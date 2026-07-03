import { forecastPipeline, STAGE_WIN_PROBABILITY, type PipelineForecast } from '../domain/forecast';
import {
  clientInsights,
  learnStageProbabilities,
  winProbabilityFrom,
  type ClientInsight,
  type StageProbability,
} from '../domain/stage-history';
import type { Candidacy } from '../domain/candidacy';
import type { MandateRepository } from '../ports/mandate-repository';
import type { CandidacyRepository } from '../ports/candidacy-repository';
import type { StageTransitionRepository } from '../ports/stage-transition-repository';

export interface ForecastServiceDeps {
  mandateRepository: MandateRepository;
  candidacyRepository: CandidacyRepository;
  stageTransitionRepository: StageTransitionRepository;
}

/** The v1 forecast plus how its stage curve was determined (ADR-0016). */
export interface PipelineForecastV2 extends PipelineForecast {
  /** Per open stage: the probability used, its source, and the evidence. */
  probabilities: StageProbability[];
  /** Interview intelligence: per-client interview→placement conversion. */
  insights: ClientInsight[];
}

/**
 * Weighted revenue forecast over the team's live pipeline: every non-closed
 * mandate's fee value weighted by the probability its pipeline yields a
 * placement. Forecast v2 learns that probability curve from the desk's own
 * resolved candidacies (stage-transition log) once enough data exists, and
 * always says which source each number came from. Team-scoped.
 */
export class ForecastService {
  private readonly mandates: MandateRepository;
  private readonly candidacies: CandidacyRepository;
  private readonly transitions: StageTransitionRepository;

  constructor(deps: ForecastServiceDeps) {
    this.mandates = deps.mandateRepository;
    this.candidacies = deps.candidacyRepository;
    this.transitions = deps.stageTransitionRepository;
  }

  async forecast(scope: string): Promise<PipelineForecastV2> {
    const allMandates = await this.mandates.list(scope);
    const transitions = await this.transitions.list(scope);
    const probabilities = learnStageProbabilities(transitions, STAGE_WIN_PROBABILITY);

    // Closed mandates carry no open pipeline — leave them out of the forecast
    // (their history still teaches the curve above).
    const mandates = allMandates.filter((m) => m.status !== 'closed');
    const byMandate = new Map<string, Candidacy[]>();
    await Promise.all(
      mandates.map(async (m) => {
        byMandate.set(m.id, await this.candidacies.listForMandate(scope, m.id));
      }),
    );
    const base = forecastPipeline(mandates, byMandate, winProbabilityFrom(probabilities));
    const insights = clientInsights(transitions, new Map(allMandates.map((m) => [m.id, m.client])));
    return { ...base, probabilities, insights };
  }
}
