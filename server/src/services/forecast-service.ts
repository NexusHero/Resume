import { forecastPipeline, type PipelineForecast } from '../domain/forecast';
import type { Candidacy } from '../domain/candidacy';
import type { MandateRepository } from '../ports/mandate-repository';
import type { CandidacyRepository } from '../ports/candidacy-repository';

export interface ForecastServiceDeps {
  mandateRepository: MandateRepository;
  candidacyRepository: CandidacyRepository;
}

/**
 * Weighted revenue forecast over the team's live pipeline: every non-closed
 * mandate's fee value weighted by the probability its pipeline yields a
 * placement. Team-scoped, like the rest of the recruiting data.
 */
export class ForecastService {
  private readonly mandates: MandateRepository;
  private readonly candidacies: CandidacyRepository;

  constructor(deps: ForecastServiceDeps) {
    this.mandates = deps.mandateRepository;
    this.candidacies = deps.candidacyRepository;
  }

  async forecast(scope: string): Promise<PipelineForecast> {
    // Closed mandates carry no open pipeline — leave them out of the forecast.
    const mandates = (await this.mandates.list(scope)).filter((m) => m.status !== 'closed');
    const byMandate = new Map<string, Candidacy[]>();
    await Promise.all(
      mandates.map(async (m) => {
        byMandate.set(m.id, await this.candidacies.listForMandate(scope, m.id));
      }),
    );
    return forecastPipeline(mandates, byMandate);
  }
}
