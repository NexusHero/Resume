import {
  type CreateObservationInput,
  type InterviewObservation,
  type ObservedProfile,
  aggregateObservations,
  companyKeyOf,
} from '../domain/interview-observation.js';
import { NotFoundError } from '../domain/errors.js';
import type { InterviewObservationRepository } from '../ports/interview-observation-repository.js';
import type { MandateRepository } from '../ports/mandate-repository.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';

export interface InterviewObservationServiceDeps {
  interviewObservationRepository: InterviewObservationRepository;
  mandateRepository: MandateRepository;
  clock: Clock;
  idGenerator: IdGenerator;
}

export interface CompanyKnowledge {
  company: string;
  profile: ObservedProfile | null;
  observations: InterviewObservation[];
}

/**
 * The observation flywheel: record real interview experiences per mandate's
 * company and read them back as an aggregate "observed profile". Team-scoped.
 */
export class InterviewObservationService {
  private readonly repo: InterviewObservationRepository;
  private readonly mandates: MandateRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: InterviewObservationServiceDeps) {
    this.repo = deps.interviewObservationRepository;
    this.mandates = deps.mandateRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  private async mandateOr404(scope: string, mandateId: string) {
    const mandate = await this.mandates.findById(scope, mandateId);
    if (!mandate) throw new NotFoundError(`Mandate ${mandateId} not found`);
    return mandate;
  }

  /** Record an interview experience for the mandate's company. */
  async record(
    scope: string,
    mandateId: string,
    input: CreateObservationInput,
  ): Promise<InterviewObservation> {
    const mandate = await this.mandateOr404(scope, mandateId);
    const observation: InterviewObservation = {
      id: this.ids.next(),
      ownerId: scope,
      companyKey: companyKeyOf(mandate.client),
      company: mandate.client,
      mandateId,
      talentId: input.talentId,
      rounds: input.rounds,
      formats: input.formats,
      difficulty: input.difficulty,
      notes: input.notes,
      at: this.clock.isoNow(),
    };
    await this.repo.add(observation);
    return observation;
  }

  /** The aggregated company knowledge for a mandate's company. */
  async forMandate(scope: string, mandateId: string): Promise<CompanyKnowledge> {
    const mandate = await this.mandateOr404(scope, mandateId);
    const observations = await this.repo.listForCompany(scope, companyKeyOf(mandate.client));
    return { company: mandate.client, profile: aggregateObservations(observations), observations };
  }
}
