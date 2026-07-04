import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { TenantRepository } from '../ports/tenant-repository.js';
import type { Tenant, TenantStatus } from '../domain/tenant.js';

/** File-backed tenant records (the JSON array in tenants.json). */
export class FsTenantRepository implements TenantRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.tenantsFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<Tenant[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Tenant[]) : [];
    } catch {
      return [];
    }
  }

  private async write(tenants: Tenant[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(tenants, null, 2) + '\n');
  }

  async create(tenant: Tenant): Promise<void> {
    const all = await this.readAll();
    all.push(tenant);
    await this.write(all);
  }

  async findById(id: string): Promise<Tenant | null> {
    return (await this.readAll()).find((t) => t.id === id) ?? null;
  }

  async list(): Promise<Tenant[]> {
    return (await this.readAll()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async setStatus(id: string, status: TenantStatus): Promise<boolean> {
    const all = await this.readAll();
    let changed = false;
    const next = all.map((t) => {
      if (t.id === id && t.status !== status) {
        changed = true;
        return { ...t, status };
      }
      return t;
    });
    if (changed) await this.write(next);
    return changed;
  }
}
