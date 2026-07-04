import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { InviteRepository } from '../ports/invite-repository.js';
import type { TenantInvite } from '../domain/tenant-invite.js';

/**
 * File-backed tenant invitations (the JSON array in tenant-invites.json).
 * Single-use on consume; TTL is enforced by the service, not here.
 */
export class FsInviteRepository implements InviteRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.inviteTokensFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<TenantInvite[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as TenantInvite[]) : [];
    } catch {
      return [];
    }
  }

  private async write(invites: TenantInvite[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(invites, null, 2) + '\n');
  }

  async create(invite: TenantInvite): Promise<void> {
    const all = await this.readAll();
    all.push(invite);
    await this.write(all);
  }

  async consume(token: string): Promise<TenantInvite | null> {
    const all = await this.readAll();
    const record = all.find((i) => i.token === token);
    if (!record) return null;
    await this.write(all.filter((i) => i.token !== token)); // single-use
    return record;
  }

  async listByTenant(tenantId: string): Promise<TenantInvite[]> {
    const all = await this.readAll();
    return all
      .filter((i) => i.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
