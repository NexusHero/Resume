import { type Talent, type CreateTalentInput, type UpdateTalentInput } from '../domain/talent';
import { NotFoundError } from '../domain/errors';
import type { TalentRepository } from '../ports/talent-repository';
import type { DocumentRepository } from '../ports/document-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

export interface TalentServiceDeps {
  talentRepository: TalentRepository;
  documentRepository: DocumentRepository;
  clock: Clock;
  idGenerator: IdGenerator;
}

/** CRUD for the talent pool. */
export class TalentService {
  private readonly repo: TalentRepository;
  private readonly documents: DocumentRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: TalentServiceDeps) {
    this.repo = deps.talentRepository;
    this.documents = deps.documentRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  list(ownerId: string): Promise<Talent[]> {
    return this.repo.list(ownerId);
  }

  async get(ownerId: string, id: string): Promise<Talent> {
    const talent = await this.repo.findById(ownerId, id);
    if (!talent) throw new NotFoundError(`Talent ${id} not found`);
    return talent;
  }

  async create(ownerId: string, input: CreateTalentInput): Promise<Talent> {
    const now = this.clock.isoNow();
    const talent: Talent = {
      id: this.ids.next(),
      ownerId,
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

  async update(ownerId: string, id: string, patch: UpdateTalentInput): Promise<Talent> {
    const existing = await this.get(ownerId, id);
    const updated: Talent = { ...existing, ...patch, updatedAt: this.clock.isoNow() };
    await this.repo.update(updated);
    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const removed = await this.repo.remove(ownerId, id);
    if (!removed) throw new NotFoundError(`Talent ${id} not found`);
    // Cascade: a talent's documents go with it.
    await this.documents.removeForTalent(ownerId, id);
  }
}
