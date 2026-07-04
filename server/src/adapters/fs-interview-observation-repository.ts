import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { InterviewObservation } from '../domain/interview-observation.js';
import type { InterviewObservationRepository } from '../ports/interview-observation-repository.js';

/** File-backed repository: the JSON array in the store's interview-observations.json. */
export class FsInterviewObservationRepository implements InterviewObservationRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.interviewObservationsFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<InterviewObservation[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as InterviewObservation[]) : [];
    } catch {
      return [];
    }
  }

  async add(observation: InterviewObservation): Promise<void> {
    const all = await this.readAll();
    all.push(observation);
    await this.write(all);
  }

  async listForCompany(ownerId: string, companyKey: string): Promise<InterviewObservation[]> {
    return (await this.readAll())
      .filter((o) => o.ownerId === ownerId && o.companyKey === companyKey)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  async list(ownerId: string): Promise<InterviewObservation[]> {
    return (await this.readAll())
      .filter((o) => o.ownerId === ownerId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  private async write(rows: InterviewObservation[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(rows, null, 2) + '\n');
  }
}
