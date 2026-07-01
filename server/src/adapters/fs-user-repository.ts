import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { User } from '../domain/user';
import type { UserRepository } from '../ports/user-repository';

/** File-backed repository: the JSON array in bewerbungen/users.json. */
export class FsUserRepository implements UserRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.usersFile;
    this.dir = path.dirname(this.file);
  }

  async list(): Promise<User[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as User[]) : [];
    } catch {
      return [];
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const all = await this.list();
    return all.find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const all = await this.list();
    return all.find((u) => u.id === id) ?? null;
  }

  async add(user: User): Promise<void> {
    const all = await this.list();
    all.push(user);
    await this.write(all);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const all = await this.list();
    const next = all.map((u) => (u.id === id ? { ...u, passwordHash } : u));
    await this.write(next);
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const next = all.filter((u) => u.id !== id);
    if (next.length === all.length) return false;
    await this.write(next);
    return true;
  }

  private async write(users: User[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(users, null, 2) + '\n');
  }
}
