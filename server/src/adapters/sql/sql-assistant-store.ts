import { and, eq } from 'drizzle-orm';
import type { AssistantSettings, AssistantSuggestion } from '../../domain/assistant';
import type {
  AssistantSettingsStore,
  AssistantSuggestionRepository,
} from '../../ports/assistant-store';
import type { Db } from './db';
import { assistantSettings, assistantSuggestions } from './schema';
import { rowToAssistantSuggestion, assistantSuggestionToRow } from './mappers';

/** Postgres-backed assistant configuration (one row per team scope). */
export class SqlAssistantSettingsStore implements AssistantSettingsStore {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async get(ownerId: string): Promise<AssistantSettings | null> {
    const rows = await this.db
      .select()
      .from(assistantSettings)
      .where(eq(assistantSettings.ownerId, ownerId));
    return rows[0]?.settings ?? null;
  }

  async set(ownerId: string, settings: AssistantSettings): Promise<void> {
    await this.db
      .insert(assistantSettings)
      .values({ ownerId, settings })
      .onConflictDoUpdate({ target: assistantSettings.ownerId, set: { settings } });
  }
}

/** Postgres-backed assistant suggestion queue. */
export class SqlAssistantSuggestionRepository implements AssistantSuggestionRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string): Promise<AssistantSuggestion[]> {
    const rows = await this.db
      .select()
      .from(assistantSuggestions)
      .where(eq(assistantSuggestions.ownerId, ownerId));
    return rows
      .map(rowToAssistantSuggestion)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(ownerId: string, id: string): Promise<AssistantSuggestion | null> {
    const rows = await this.db
      .select()
      .from(assistantSuggestions)
      .where(and(eq(assistantSuggestions.ownerId, ownerId), eq(assistantSuggestions.id, id)));
    return rows[0] ? rowToAssistantSuggestion(rows[0]) : null;
  }

  async add(suggestion: AssistantSuggestion): Promise<void> {
    await this.db.insert(assistantSuggestions).values(assistantSuggestionToRow(suggestion));
  }

  async update(suggestion: AssistantSuggestion): Promise<void> {
    await this.db
      .update(assistantSuggestions)
      .set(assistantSuggestionToRow(suggestion))
      .where(
        and(
          eq(assistantSuggestions.ownerId, suggestion.ownerId),
          eq(assistantSuggestions.id, suggestion.id),
        ),
      );
  }
}
