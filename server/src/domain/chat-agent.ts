import { z } from 'zod';
import type { GroundingReport } from './grounding.js';

/**
 * The Chat-Agent (Phase 5, ADR-0062): a persisted conversation a user drives
 * against the Phase 1–4 services via a server-side tool-use loop. A `ChatSession`
 * is scoped to a workspace (`ownerId`) **and** a user (`userId`) — one session is
 * only visible to the user who created it (AK-5.7). `messages` is one embedded
 * JSON array (no separate store, no FK): deleting the session deletes the
 * transcript, and the transcript deliberately carries no `rawText` and no base
 * documents (data minimisation).
 */
export type ChatRole = 'user' | 'assistant' | 'tool' | 'system';

/** One tool call the model asked for (an assistant step). `id` is the provider's
    wire id, kept so a replayed history can pair a `tool_result` back to it. */
export interface ChatToolCall {
  id: string;
  name: string;
  args: unknown;
}

/** One tool outcome returned to the model. `toolCallId` pairs it to its call. */
export interface ChatToolResult {
  toolCallId: string;
  name: string;
  content: string;
  /** True when the tool failed — the agent answers honestly instead of inventing (ADR-0047). */
  isError?: boolean;
}

export interface ChatMessage {
  role: ChatRole;
  /** user/assistant prose (assistant text is the streamed, accumulated text). */
  text?: string;
  /** an assistant tool step. */
  toolCall?: ChatToolCall;
  /** a tool outcome (tool → assistant). */
  toolResult?: ChatToolResult;
  createdAt: string; // ISO 8601
}

/** The summed token/cost spend of one run (equals `CallUsage` in shape). */
export interface ChatRunUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export type ChatSessionStatus = 'running' | 'done' | 'aborted' | 'limit-reached' | 'error';

export interface ChatSession {
  id: string;
  /** Workspace scope (ADR-0010/0033). */
  ownerId: string;
  /** The owning user — sessions are per user, not per team (AK-5.7). */
  userId: string;
  /** `draftTitleOf(firstMessage)`. */
  title?: string;
  messages: ChatMessage[];
  status: ChatSessionStatus;
  usage: ChatRunUsage;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/v1/agent/chat — start a run or continue an existing session. */
export const createChatSessionSchema = z
  .object({
    sessionId: z.string().min(1).optional(),
    message: z.string().min(1, 'message is required'),
  })
  .strict();
export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;

/** The nine tools the agent may call — a closed registry (AK-5.2). */
export const TOOL_NAMES = [
  'search_jobs',
  'save_job',
  'list_mandanten',
  'assess_fit',
  'create_application',
  'list_applications',
  'generate_letter',
  'tailor_section',
  'tailor_all',
] as const;
export type AgentToolName = (typeof TOOL_NAMES)[number];

/**
 * The dev-only `AGENT_FAKE` guard (Minor 3, §3.6): the deterministic fake agent
 * is wired **only** when `AGENT_FAKE === '1'` **and** `NODE_ENV !== 'production'`.
 * Production always gets the real provider, never a scripted transcript.
 */
export function agentFakeEnabled(env: { NODE_ENV?: string; AGENT_FAKE?: string }): boolean {
  if (env.NODE_ENV === 'production') return false;
  return env.AGENT_FAKE === '1';
}

/** A created draft the summary and the `drafts` SSE event reference. */
export interface DraftRef {
  jobApplicationId: string;
  postingCompany: string;
  postingTitle: string;
}

/** A short, stable session title from the first user message. */
export function draftTitleOf(firstMessage: string): string {
  const singleLine = firstMessage.trim().replace(/\s+/g, ' ');
  const MAX = 60;
  if (singleLine.length <= MAX) return singleLine;
  return `${singleLine.slice(0, MAX - 1).trimEnd()}…`;
}

/**
 * The deterministic limit summary (AK-5.3): a plain-text, honest report of what
 * the run created — **no** second LLM call. The structured links ride the SSE
 * `drafts` event; this text is the human-readable recap.
 */
export function summarizeRun(drafts: DraftRef[]): string {
  if (drafts.length === 0) {
    return 'The agent did not create any application drafts in this run.';
  }
  const listing = drafts.map((d) => `${d.postingCompany} – ${d.postingTitle}`).join(', ');
  return drafts.length === 1
    ? `1 application draft created: ${listing}.`
    : `${drafts.length} application drafts created: ${listing}.`;
}

/**
 * Wrap untrusted data (a tool result, an ad text) before it goes back to the
 * model, so an embedded instruction is treated as content, never as a command
 * (ADR-0062 §9 — the same injection defence as magic-pen/application-letter).
 */
export function untrustedBlock(label: string, text: string): string {
  return `<untrusted-data label="${label}">${text}</untrusted-data>`;
}

/** True when a grounding self-check found no unsupported claims (AK-3.4). */
export function isGroundingClean(report: GroundingReport): boolean {
  return report.grounded;
}

/** The `ChatMessage` zod schema (documented in OpenAPI, used by the mappers). */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  text: z.string().optional(),
  toolCall: z
    .object({
      id: z.string(),
      name: z.string(),
      args: z.unknown(),
    })
    .optional(),
  toolResult: z
    .object({
      toolCallId: z.string(),
      name: z.string(),
      content: z.string(),
      isError: z.boolean().optional(),
    })
    .optional(),
  createdAt: z.string(),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
