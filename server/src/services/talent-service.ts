import { type Talent, type CreateTalentInput, type UpdateTalentInput } from '../domain/talent';
import { NotFoundError } from '../domain/errors';
import type { TalentRepository } from '../ports/talent-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

export interface TalentServiceDeps {
  talentRepository: TalentRepository;
  clock: Clock;
  idGenerator: IdGenerator;
}

/** CRUD for the talent pool. */
export class TalentService {
  private readonly repo: TalentRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: TalentServiceDeps) {
    this.repo = deps.talentRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  list(): Promise<Talent[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Talent> {
    const talent = await this.repo.findById(id);
    if (!talent) throw new NotFoundError(`Talent ${id} not found`);
    return talent;
  }

  async create(input: CreateTalentInput): Promise<Talent> {
    const now = this.clock.isoNow();
    const talent: Talent = {
      id: this.ids.next(),
      name: input.name,
      role: input.role,
      headline: input.headline,
      location: input.location,
      email: input.email,
      phone: input.phone,
      availability: input.availability,
      salary: input.salary,
      skills: input.skills,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.add(talent);
    return talent;
  }

  async update(id: string, patch: UpdateTalentInput): Promise<Talent> {
    const existing = await this.get(id);
    const updated: Talent = { ...existing, ...patch, updatedAt: this.clock.isoNow() };
    await this.repo.update(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundError(`Talent ${id} not found`);
  }
}
