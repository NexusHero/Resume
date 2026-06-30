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

  list(): Promise<Mandate[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Mandate> {
    const mandate = await this.repo.findById(id);
    if (!mandate) throw new NotFoundError(`Mandate ${id} not found`);
    return mandate;
  }

  async create(input: CreateMandateInput): Promise<Mandate> {
    const now = this.clock.isoNow();
    const mandate: Mandate = {
      id: this.ids.next(),
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

  async update(id: string, patch: UpdateMandateInput): Promise<Mandate> {
    const existing = await this.get(id);
    const updated: Mandate = { ...existing, ...patch, updatedAt: this.clock.isoNow() };
    await this.repo.update(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundError(`Mandate ${id} not found`);
  }
}
