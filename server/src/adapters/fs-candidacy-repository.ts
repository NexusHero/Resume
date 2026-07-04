import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { Candidacy } from '../domain/candidacy.js';
import type { CandidacyRepository } from '../ports/candidacy-repository.js';

/** File-backed repository: the JSON array in the store's candidacies.json. */
export class FsCandidacyRepository implements CandidacyRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.candidaciesFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<Candidacy[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Candidacy[]) : [];
    } catch {
      return [];
    }
  }

  async listForMandate(ownerId: string, mandateId: string): Promise<Candidacy[]> {
    return (await this.readAll()).filter((c) => c.ownerId === ownerId && c.mandateId === mandateId);
  }

  async listForTalent(ownerId: string, talentId: string): Promise<Candidacy[]> {
    return (await this.readAll()).filter((c) => c.ownerId === ownerId && c.talentId === talentId);
  }

  async findById(ownerId: string, id: string): Promise<Candidacy | null> {
    return (await this.readAll()).find((c) => c.ownerId === ownerId && c.id === id) ?? null;
  }

  async findByMandateAndTalent(
    ownerId: string,
    mandateId: string,
    talentId: string,
  ): Promise<Candidacy | null> {
    return (
      (await this.readAll()).find(
        (c) => c.ownerId === ownerId && c.mandateId === mandateId && c.talentId === talentId,
      ) ?? null
    );
  }

  async add(candidacy: Candidacy): Promise<void> {
    const all = await this.readAll();
    all.push(candidacy);
    await this.write(all);
  }

  async update(candidacy: Candidacy): Promise<void> {
    const all = await this.readAll();
    const i = all.findIndex((c) => c.ownerId === candidacy.ownerId && c.id === candidacy.id);
    if (i >= 0) {
      all[i] = candidacy;
      await this.write(all);
    }
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const all = await this.readAll();
    const next = all.filter((c) => !(c.ownerId === ownerId && c.id === id));
    if (next.length === all.length) return false;
    await this.write(next);
    return true;
  }

  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((c) => !(c.ownerId === ownerId && c.talentId === talentId));
    if (next.length !== all.length) await this.write(next);
  }

  async removeForMandate(ownerId: string, mandateId: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((c) => !(c.ownerId === ownerId && c.mandateId === mandateId));
    if (next.length !== all.length) await this.write(next);
  }

  async removeForOwner(ownerId: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((c) => c.ownerId !== ownerId);
    if (next.length !== all.length) await this.write(next);
  }

  private async write(rows: Candidacy[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(rows, null, 2) + '\n');
  }
}
