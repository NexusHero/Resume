import { eq } from 'drizzle-orm';
import type { User } from '../../domain/user';
import type { UserRepository } from '../../ports/user-repository';
import type { Db } from './db';
import { users } from './schema';
import { rowToUser, userToRow } from './mappers';

/** Postgres-backed repository for registered accounts. */
export class SqlUserRepository implements UserRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email));
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async add(user: User): Promise<void> {
    await this.db.insert(users).values(userToRow(user));
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return removed.length > 0;
  }
}
