import type { LlmProviderId, TokenUsage } from './llm-provider.js';

/**
 * A provider-neutral streaming port for the Chat-Agent's tool-use loop
 * (ADR-0062 §1). The existing {@link LlmProvider} stays untouched: it models one
 * `generate` call, while an agentic turn streams a normalised sequence of
 * `text-delta` / `tool-use` / `done` events over an `AsyncIterable`, carries tool
 * schemata and an `AbortSignal`, and has a different life cycle — so it lives
 * behind its own narrow seam.
 */

/** A tool the agent may call. `description` states the draft-only contract. */
export interface AgentTool {
  name: string;
  description: string; // includes "draft-only, never send/delete/change status"
  inputSchema: Record<string, unknown>; // JSON Schema subset, both providers
}

/** One message (or a group) in the replayed history handed to the provider. */
export interface AgentMessagePart {
  role: 'user' | 'assistant';
  text?: string;
  toolCalls?: { id: string; name: string; input: unknown }[];
  toolResults?: { toolCallId: string; name: string; content: string; isError?: boolean }[];
}

export interface AgentTurnInput {
  system?: string;
  messages: AgentMessagePart[];
  tools: AgentTool[];
  /** Output cap for this round. */
  maxTokens?: number;
  /** Abort (user cancelled or maxTime elapsed). */
  signal?: AbortSignal;
}

export type AgentTurnEvent =
  | { kind: 'text-delta'; text: string }
  | { kind: 'tool-use'; id: string; name: string; input: unknown }
  | { kind: 'done'; stopReason: 'end_turn' | 'tool_use' | 'max_tokens'; usage: TokenUsage };

export interface AgentLlmProvider {
  readonly id: LlmProviderId;
  /**
   * Stream one agentic round. Anthropic streams token-by-token; Gemini emits
   * exactly one `text-delta` (or `tool-use`) then `done` per call (Owner Q1) —
   * the `AsyncIterable` contract is identical, only the delta count differs.
   */
  streamAgentTurn(input: AgentTurnInput): AsyncIterable<AgentTurnEvent>;
}
