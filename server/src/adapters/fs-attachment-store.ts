import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { Attachment } from '../domain/attachment';
import type { AttachmentBlob, AttachmentStore } from '../ports/attachment-store';

/**
 * File-backed attachment store: metadata in bewerbungen/attachments.json, the
 * bytes as individual files under bewerbungen/attachments/<id>.
 */
export class FsAttachmentStore implements AttachmentStore {
  private readonly file: string;
  private readonly dir: string;
  private readonly blobDir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.attachmentsFile;
    this.dir = path.dirname(this.file);
    this.blobDir = deps.config.attachmentsDir;
  }

  private async readMeta(): Promise<Attachment[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Attachment[]) : [];
    } catch {
      return [];
    }
  }

  private async writeMeta(list: Attachment[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(list, null, 2) + '\n');
  }

  private blobPath(id: string): string {
    return path.join(this.blobDir, id);
  }

  private async deleteBlob(id: string): Promise<void> {
    await fs.rm(this.blobPath(id), { force: true });
  }

  async add(attachment: Attachment, bytes: Buffer): Promise<void> {
    await fs.mkdir(this.blobDir, { recursive: true });
    await fs.writeFile(this.blobPath(attachment.id), bytes);
    const all = await this.readMeta();
    all.push(attachment);
    await this.writeMeta(all);
  }

  async list(ownerId: string, talentId: string): Promise<Attachment[]> {
    return (await this.readMeta()).filter((a) => a.ownerId === ownerId && a.talentId === talentId);
  }

  async get(ownerId: string, id: string): Promise<AttachmentBlob | null> {
    const attachment = (await this.readMeta()).find((a) => a.ownerId === ownerId && a.id === id);
    if (!attachment) return null;
    try {
      const bytes = await fs.readFile(this.blobPath(id));
      return { attachment, bytes };
    } catch {
      return null;
    }
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const all = await this.readMeta();
    const next = all.filter((a) => !(a.ownerId === ownerId && a.id === id));
    if (next.length === all.length) return false;
    await this.deleteBlob(id);
    await this.writeMeta(next);
    return true;
  }

  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    await this.removeWhere((a) => a.ownerId === ownerId && a.talentId === talentId);
  }

  async removeForOwner(ownerId: string): Promise<void> {
    await this.removeWhere((a) => a.ownerId === ownerId);
  }

  private async removeWhere(match: (a: Attachment) => boolean): Promise<void> {
    const all = await this.readMeta();
    const dropped = all.filter(match);
    if (!dropped.length) return;
    await Promise.all(dropped.map((a) => this.deleteBlob(a.id)));
    await this.writeMeta(all.filter((a) => !match(a)));
  }
}
