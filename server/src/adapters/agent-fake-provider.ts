import type { LlmProviderId } from '../ports/llm-provider.js';
import type {
  AgentLlmProvider,
  AgentTurnEvent,
  AgentTurnInput,
} from '../ports/agent-llm-provider.js';

/**
 * Dev-only deterministic fake agent (ADR-0062 §10 / Plan §3.6). It scripts the
 * exact turn sequence a tool-use loop consumes — one turn per `streamAgentTurn`
 * call, the last turn repeating — so the manual protocol (§9) and the live
 * scenario suite run with a fixed, reproducible transcript instead of a real
 * model. It is **only** wired when `agentFakeEnabled(env)` (i.e. `AGENT_FAKE ===
 * '1'` and `NODE_ENV !== 'production'`); production always gets the real
 * provider. This fake exists to exercise the loop mechanics (SSE, tool chips,
 * budgets, persistence), never to stand in for the model in a real deployment.
 */
export class FakeAgentLlmProvider implements AgentLlmProvider {
  readonly id: LlmProviderId;
  private readonly turns: AgentTurnEvent[][];

  constructor(
    turns: AgentTurnEvent[][] = DEFAULT_AGENT_FAKE_TRANSCRIPT,
    id: LlmProviderId = 'claude',
  ) {
    this.id = id;
    this.turns = turns.map((t) => [...t]);
  }

  async *streamAgentTurn(_input: AgentTurnInput): AsyncIterable<AgentTurnEvent> {
    const turn = this.turns.length > 1 ? (this.turns.shift() as AgentTurnEvent[]) : this.turns[0];
    const events = turn ?? [];
    for (const ev of events) yield ev;
    if (!events.some((e) => e.kind === 'done')) {
      yield { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 0, outputTokens: 0 } };
    }
  }
}

/**
 * A deterministic happy-path transcript: round one lists the pool, round two
 * finishes with a text answer. Enough to exercise the full SSE + tool loop
 * (text deltas, a tool call, its result, the usage footer, the `done` event).
 */
export const DEFAULT_AGENT_FAKE_TRANSCRIPT: AgentTurnEvent[][] = [
  [
    { kind: 'text-delta', text: 'Ich sehe mir deine Mandanten an.' },
    { kind: 'tool-use', id: 'toolu_fake_1', name: 'list_mandanten', input: {} },
    { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 12, outputTokens: 30 } },
  ],
  [
    {
      kind: 'text-delta',
      text: 'Das habe ich für dich vorbereitet — die Entwürfe findest du in der Übersicht.',
    },
    { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 40, outputTokens: 25 } },
  ],
];
