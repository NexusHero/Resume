import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { TalentDocuments } from '../domain/talent-documents';
import type { DocumentRepository } from '../ports/document-repository';

/** File-backed repository: the JSON array in bewerbungen/documents.json. */
export class FsDocumentRepository implements DocumentRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.documentsFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<TalentDocuments[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as TalentDocuments[]) : [];
    } catch {
      return [];
    }
  }

  async get(ownerId: string, talentId: string): Promise<TalentDocuments | null> {
    return (
      (await this.readAll()).find((d) => d.ownerId === ownerId && d.talentId === talentId) ?? null
    );
  }

  async save(documents: TalentDocuments): Promise<void> {
    const all = await this.readAll();
    const i = all.findIndex(
      (d) => d.ownerId === documents.ownerId && d.talentId === documents.talentId,
    );
    if (i < 0) all.push(documents);
    else all[i] = documents;
    await this.write(all);
  }

  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((d) => !(d.ownerId === ownerId && d.talentId === talentId));
    if (next.length !== all.length) await this.write(next);
  }

  async removeForOwner(ownerId: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((d) => d.ownerId !== ownerId);
    if (next.length !== all.length) await this.write(next);
  }

  private async write(documents: TalentDocuments[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(documents, null, 2) + '\n');
  }
}
