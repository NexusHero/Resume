import type { AssistantSettings, AssistantSuggestion } from '../domain/assistant.js';

/** Persistence of the team's assistant configuration (one row per scope). */
export interface AssistantSettingsStore {
  /** The stored settings, or null when the team never configured the assistant. */
  get(ownerId: string): Promise<AssistantSettings | null>;
  set(ownerId: string, settings: AssistantSettings): Promise<void>;
}

/** Persistence of the assistant's suggestion queue, scoped to an owner. */
export interface AssistantSuggestionRepository {
  /** Every suggestion of the owner, newest first. */
  list(ownerId: string): Promise<AssistantSuggestion[]>;
  findById(ownerId: string, id: string): Promise<AssistantSuggestion | null>;
  add(suggestion: AssistantSuggestion): Promise<void>;
  update(suggestion: AssistantSuggestion): Promise<void>;
}
