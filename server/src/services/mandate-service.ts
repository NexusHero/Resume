import { type Mandate, type CreateMandateInput, type UpdateMandateInput } from '../domain/mandate';
import { NotFoundError } from '../domain/errors';
import type { MandateRepository } from '../ports/mandate-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

export interface MandateServiceDeps {
  mandateRepository: MandateRepository;
  clock: Clock;
  idGenerator: IdGenerator;
}

/** CRUD for client search mandates. */
export class MandateService {
  private readonly repo: MandateRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: MandateServiceDeps) {
    this.repo = deps.mandateRepository;
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
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.add(mandate);
    return mandate;
  }

  async update(ownerId: string, id: string, patch: UpdateMandateInput): Promise<Mandate> {
    const existing = await this.get(ownerId, id);
    const updated: Mandate = { ...existing, ...patch, updatedAt: this.clock.isoNow() };
    await this.repo.update(updated);
    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const removed = await this.repo.remove(ownerId, id);
    if (!removed) throw new NotFoundError(`Mandate ${id} not found`);
  }
}
