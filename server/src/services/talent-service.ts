import { type Talent, type CreateTalentInput, type UpdateTalentInput } from '../domain/talent';
import { candidateSkills } from '../domain/match';
import { NotFoundError } from '../domain/errors';
import type { TalentRepository } from '../ports/talent-repository';
import type { DocumentRepository } from '../ports/document-repository';
import type { TalentDataPurger } from '../ports/talent-data';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

/** A listed talent: stored fields plus the skills their documents prove. */
export type TalentWithSkills = Talent & { effectiveSkills: string[] };

export interface TalentServiceDeps {
  talentRepository: TalentRepository;
  documentRepository: DocumentRepository;
  talentDataPurgers: TalentDataPurger[];
  clock: Clock;
  idGenerator: IdGenerator;
}

/** CRUD for the talent pool. */
export class TalentService {
  private readonly repo: TalentRepository;
  private readonly documents: DocumentRepository;
  private readonly purgers: TalentDataPurger[];
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: TalentServiceDeps) {
    this.repo = deps.talentRepository;
    this.documents = deps.documentRepository;
    this.purgers = deps.talentDataPurgers;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  list(ownerId: string): Promise<Talent[]> {
    return this.repo.list(ownerId);
  }

  /**
   * The pool as the API lists it: each talent carries `effectiveSkills` — the
   * stored skills merged with what their documents prove (canonicalized), so
   * client-side matching scores against the full picture, not just the fields
   * someone remembered to type into the form.
   */
  async listWithSkills(ownerId: string): Promise<TalentWithSkills[]> {
    const talents = await this.repo.list(ownerId);
    return Promise.all(
      talents.map(async (talent) => ({
        ...talent,
        effectiveSkills: candidateSkills(talent, await this.documents.get(ownerId, talent.id)),
      })),
    );
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
    // Cascade: run every registered talent-data purger in `erase` mode, so the
    // talent's documents, attachments and candidacies all go with them. The
    // erase/anonymize divergence (anonymize keeps candidacies) lives in the
    // registry, not in two divergent method bodies.
    for (const purger of this.purgers) {
      await purger.purge(ownerId, id, 'erase');
    }
  }
}
