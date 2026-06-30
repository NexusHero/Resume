import {
  type Placement,
  type CreatePlacementInput,
  type UpdatePlacementInput,
} from '../domain/placement';
import { NotFoundError } from '../domain/errors';
import type { PlacementRepository } from '../ports/placement-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

export interface PlacementServiceDeps {
  placementRepository: PlacementRepository;
  clock: Clock;
  idGenerator: IdGenerator;
}

/** CRUD for booked placements. */
export class PlacementService {
  private readonly repo: PlacementRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: PlacementServiceDeps) {
    this.repo = deps.placementRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  list(ownerId: string): Promise<Placement[]> {
    return this.repo.list(ownerId);
  }

  async get(ownerId: string, id: string): Promise<Placement> {
    const placement = await this.repo.findById(ownerId, id);
    if (!placement) throw new NotFoundError(`Placement ${id} not found`);
    return placement;
  }

  async create(ownerId: string, input: CreatePlacementInput): Promise<Placement> {
    const now = this.clock.isoNow();
    const placement: Placement = {
      id: this.ids.next(),
      ownerId,
      candidateName: input.candidateName,
      candidateRole: input.candidateRole,
      client: input.client,
      start: input.start,
      fee: input.fee,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.add(placement);
    return placement;
  }

  async update(ownerId: string, id: string, patch: UpdatePlacementInput): Promise<Placement> {
    const existing = await this.get(ownerId, id);
    const updated: Placement = { ...existing, ...patch, updatedAt: this.clock.isoNow() };
    await this.repo.update(updated);
    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const removed = await this.repo.remove(ownerId, id);
    if (!removed) throw new NotFoundError(`Placement ${id} not found`);
  }
}
