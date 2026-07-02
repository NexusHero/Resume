import { type Mandate, type CreateMandateInput, type UpdateMandateInput } from '../domain/mandate';
import { detectLanguage } from '../domain/language';
import { NotFoundError } from '../domain/errors';
import type { MandateRepository } from '../ports/mandate-repository';
import type { CandidacyRepository } from '../ports/candidacy-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

export interface MandateServiceDeps {
  mandateRepository: MandateRepository;
  candidacyRepository: CandidacyRepository;
  clock: Clock;
  idGenerator: IdGenerator;
}

/** CRUD for client search mandates. */
export class MandateService {
  private readonly repo: MandateRepository;
  private readonly candidacies: CandidacyRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: MandateServiceDeps) {
    this.repo = deps.mandateRepository;
    this.candidacies = deps.candidacyRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  list(ownerId: string): Promise<Mandate[]> {
    return this.repo.list(ownerId);
  }

  async get(ownerId: string, id: string): Promise<Mandate> {
    const mandate = await this.repo.findById(ownerId, id);
    if (!mandate) throw new NotFoundError(`Mandate ${id} not found`);
    return mandate;
  }

  async create(ownerId: string, input: CreateMandateInput): Promise<Mandate> {
    const now = this.clock.isoNow();
    const mandate: Mandate = {
      id: this.ids.next(),
      ownerId,
      client: input.client,
      role: input.role,
      location: input.location,
      fee: input.fee,
      feeValue: input.feeValue,
      deadline: input.deadline,
      priority: input.priority,
      status: input.status,
      submitted: input.submitted,
      interviews: input.interviews,
      jobText: input.jobText,
      lang: detectLanguage(input.jobText),
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.add(mandate);
    return mandate;
  }

  async update(ownerId: string, id: string, patch: UpdateMandateInput): Promise<Mandate> {
    const existing = await this.get(ownerId, id);
    const updated: Mandate = { ...existing, ...patch, updatedAt: this.clock.isoNow() };
    // Keep the derived language in sync when the job ad text changes.
    if (patch.jobText !== undefined) updated.lang = detectLanguage(patch.jobText);
    await this.repo.update(updated);
    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const removed = await this.repo.remove(ownerId, id);
    if (!removed) throw new NotFoundError(`Mandate ${id} not found`);
    // Cascade: the mandate's pipeline candidacies go with it.
    await this.candidacies.removeForMandate(ownerId, id);
  }
}
