import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { AssistantSettings, AssistantSuggestion } from '../domain/assistant';
import type {
  AssistantSettingsStore,
  AssistantSuggestionRepository,
} from '../ports/assistant-store';

/** File-backed settings: a JSON object keyed by owner in assistant-settings.json. */
export class FsAssistantSettingsStore implements AssistantSettingsStore {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.assistantSettingsFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<Record<string, AssistantSettings>> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, AssistantSettings>)
        : {};
    } catch {
      return {};
    }
  }

  async get(ownerId: string): Promise<AssistantSettings | null> {
    return (await this.readAll())[ownerId] ?? null;
  }

  async set(ownerId: string, settings: AssistantSettings): Promise<void> {
    const all = await this.readAll();
    all[ownerId] = settings;
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(all, null, 2) + '\n');
  }
}

/** File-backed queue: the JSON array in assistant-suggestions.json. */
export class FsAssistantSuggestionRepository implements AssistantSuggestionRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.assistantSuggestionsFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<AssistantSuggestion[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as AssistantSuggestion[]) : [];
    } catch {
      return [];
    }
  }

  async list(ownerId: string): Promise<AssistantSuggestion[]> {
    return (await this.readAll())
      .filter((s) => s.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(ownerId: string, id: string): Promise<AssistantSuggestion | null> {
    return (await this.readAll()).find((s) => s.ownerId === ownerId && s.id === id) ?? null;
  }

  async add(suggestion: AssistantSuggestion): Promise<void> {
    const all = await this.readAll();
    all.push(suggestion);
    await this.write(all);
  }

  async update(suggestion: AssistantSuggestion): Promise<void> {
    const all = await this.readAll();
    const next = all.map((s) =>
      s.ownerId === suggestion.ownerId && s.id === suggestion.id ? suggestion : s,
    );
    await this.write(next);
  }

  private async write(rows: AssistantSuggestion[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(rows, null, 2) + '\n');
  }
}
