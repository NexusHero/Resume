import {
  type AssistantSettings,
  type AssistantSuggestion,
  type UpdateAssistantSettingsInput,
  DEFAULT_ASSISTANT_SETTINGS,
  isDue,
  isStale,
  daysStale,
  suggestionKey,
} from '../domain/assistant';
import { ConflictError, NotFoundError } from '../domain/errors';
import type {
  AssistantSettingsStore,
  AssistantSuggestionRepository,
} from '../ports/assistant-store';
import type { Mandate } from '../domain/mandate';
import type { MandateRepository } from '../ports/mandate-repository';
import type { TalentRepository } from '../ports/talent-repository';
import type { DocumentRepository } from '../ports/document-repository';
import type { CandidacyRepository } from '../ports/candidacy-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';
import type { Logger } from '../ports/logger';
import type { MatchService } from './match-service';
import type { CandidacyService } from './candidacy-service';
import type { AutopilotService } from './autopilot-service';

export interface AssistantRunResult {
  runId: string;
  /** Suggestions staged for review this run. */
  proposed: number;
  /** Actions the assistant applied itself (mode 'act' only). */
  applied: number;
}

export interface AssistantServiceDeps {
  assistantSettingsStore: AssistantSettingsStore;
  assistantSuggestionRepository: AssistantSuggestionRepository;
  mandateRepository: MandateRepository;
  talentRepository: TalentRepository;
  documentRepository: DocumentRepository;
  candidacyRepository: CandidacyRepository;
  matchService: MatchService;
  candidacyService: CandidacyService;
  autopilotService: AutopilotService;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
}

/** Only clear fits are proposed — a noisy assistant gets switched off. */
const MIN_MATCH_SCORE = 40;
const SHORTLIST_LIMIT = 3;
const STALE_AFTER_DAYS = 7;

/** A suggestion as a playbook step stages it — the run assigns id/owner/status. */
type StagedSuggestion = Omit<
  AssistantSuggestion,
  'id' | 'ownerId' | 'status' | 'createdAt' | 'runId'
>;
/** Stage a finding: dedups, auto-applies in mode 'act', and counts it. */
type StageFn = (s: StagedSuggestion, autoApply?: () => Promise<void>) => Promise<void>;

/**
 * The assistant: a second driver of the application services (ADR-0013). Each
 * run walks a deterministic playbook — shortlist candidates for active
 * mandates, flag stalled candidacies, flag talents too empty to match — and
 * stages every finding as a suggestion the recruiter accepts or dismisses. In
 * mode 'act' the internal, reversible shortlist step is applied directly and
 * marked auto-applied; nothing outward-facing or destructive ever runs alone.
 */
export class AssistantService {
  private readonly settingsStore: AssistantSettingsStore;
  private readonly suggestions: AssistantSuggestionRepository;
  private readonly mandates: MandateRepository;
  private readonly talents: TalentRepository;
  private readonly documents: DocumentRepository;
  private readonly candidacies: CandidacyRepository;
  private readonly match: MatchService;
  private readonly candidacyService: CandidacyService;
  private readonly autopilot: AutopilotService;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly logger: Logger;

  constructor(deps: AssistantServiceDeps) {
    this.settingsStore = deps.assistantSettingsStore;
    this.suggestions = deps.assistantSuggestionRepository;
    this.mandates = deps.mandateRepository;
    this.talents = deps.talentRepository;
    this.documents = deps.documentRepository;
    this.candidacies = deps.candidacyRepository;
    this.match = deps.matchService;
    this.candidacyService = deps.candidacyService;
    this.autopilot = deps.autopilotService;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
    this.logger = deps.logger;
  }

  async getSettings(scope: string): Promise<AssistantSettings> {
    return (await this.settingsStore.get(scope)) ?? { ...DEFAULT_ASSISTANT_SETTINGS };
  }

  async updateSettings(
    scope: string,
    input: UpdateAssistantSettingsInput,
  ): Promise<AssistantSettings> {
    const next = { ...(await this.getSettings(scope)), ...input };
    await this.settingsStore.set(scope, next);
    return next;
  }

  async list(scope: string): Promise<AssistantSuggestion[]> {
    return this.suggestions.list(scope);
  }

  /** The scheduler tick: run only when enabled and the interval has elapsed. */
  async runIfDue(scope: string): Promise<AssistantRunResult | null> {
    const settings = await this.getSettings(scope);
    if (!isDue(settings, this.clock.isoNow())) return null;
    return this.run(scope);
  }

  /** One full playbook walk. Manual runs ignore the schedule but require `enabled`. */
  async run(scope: string): Promise<AssistantRunResult> {
    const settings = await this.getSettings(scope);
    const now = this.clock.isoNow();
    const runId = this.ids.next();
    // One suggestion per (kind, mandate, talent) — dismissed ones stay blocked
    // so the assistant never nags about a call the recruiter already made.
    const seen = new Set((await this.suggestions.list(scope)).map(suggestionKey));
    let proposed = 0;
    let applied = 0;

    const stage: StageFn = async (s, autoApply) => {
      if (seen.has(suggestionKey(s))) return;
      seen.add(suggestionKey(s));
      const suggestion: AssistantSuggestion = {
        ...s,
        id: this.ids.next(),
        ownerId: scope,
        status: 'proposed',
        createdAt: now,
        runId,
      };
      if (settings.mode === 'act' && autoApply) {
        try {
          await autoApply();
          suggestion.status = 'auto-applied';
          suggestion.resolvedAt = now;
          applied += 1;
        } catch (err) {
          // Fall back to proposing when the action no longer applies.
          this.logger.warn(
            { kind: s.kind, err: err instanceof Error ? err.message : String(err) },
            'assistant auto-apply failed, staging as suggestion instead',
          );
        }
      }
      if (suggestion.status === 'proposed') proposed += 1;
      await this.suggestions.add(suggestion);
    };

    const mandates = (await this.mandates.list(scope)).filter((m) => m.status === 'active');

    // The playbook: each step stages its findings through `stage` above, which
    // owns dedup, auto-apply and counting. The steps themselves are single-concern.
    await this.proposeShortlists(scope, mandates, stage);
    await this.proposeStalledFollowUps(scope, mandates, now, stage);
    await this.proposeDataGaps(scope, stage);

    // Autopilot: build full application packets for strong matches and stage them
    // for approval. Only in the top gear — this is the token-spending step.
    if (settings.mode === 'autopilot') {
      proposed += await this.autopilot.propose(scope, settings, runId, now);
    }

    await this.settingsStore.set(scope, { ...settings, lastRunAt: now });
    this.logger.info({ runId, proposed, applied }, 'assistant run finished');
    return { runId, proposed, applied };
  }

  /** Step 1 — shortlists: clear pool fits not in the pipeline yet. In mode 'act'
      the add is applied directly (internal + reversible). */
  private async proposeShortlists(
    scope: string,
    mandates: Mandate[],
    stage: StageFn,
  ): Promise<void> {
    for (const mandate of mandates) {
      const matches = await this.match.rankForMandate(
        scope,
        mandate.id,
        mandate.jobText ?? '',
        SHORTLIST_LIMIT,
      );
      for (const m of matches.filter((x) => !x.inPipeline && x.score >= MIN_MATCH_SCORE)) {
        await stage(
          {
            kind: 'shortlist-add',
            title: `Add ${m.name} to ${mandate.client} — ${mandate.role}`,
            rationale:
              `Match score ${m.score}/100` +
              (m.matched.length ? `; the ad asks for: ${m.matched.slice(0, 6).join(', ')}` : ''),
            mandateId: mandate.id,
            talentId: m.talentId,
            payload: { score: m.score, matched: m.matched },
          },
          () => this.addToPipeline(scope, mandate.id, m.talentId, true),
        );
      }
    }
  }

  /** Step 2 — stalled candidacies: pipeline cards nobody touched for a week. */
  private async proposeStalledFollowUps(
    scope: string,
    mandates: Mandate[],
    now: string,
    stage: StageFn,
  ): Promise<void> {
    for (const mandate of mandates) {
      for (const c of await this.candidacies.listForMandate(scope, mandate.id)) {
        if (!isStale(c, now, STALE_AFTER_DAYS)) continue;
        const talent = await this.talents.findById(scope, c.talentId);
        const name = talent?.name ?? 'A candidate';
        const days = daysStale(c, now);
        await stage({
          kind: 'follow-up',
          title: `Follow up on ${name} (${mandate.client} — ${mandate.role})`,
          rationale: `In stage "${c.stage}" for ${days} days without movement.`,
          mandateId: mandate.id,
          talentId: c.talentId,
          payload: { stage: c.stage, daysStale: days },
        });
      }
    }
  }

  /** Step 3 — data gaps: talents matching can't see because there is nothing to score. */
  private async proposeDataGaps(scope: string, stage: StageFn): Promise<void> {
    for (const talent of await this.talents.list(scope)) {
      if (talent.anonymizedAt || talent.skills.length > 0) continue;
      const documents = await this.documents.get(scope, talent.id);
      const hasSubstance =
        !!documents &&
        (documents.resume.experience.length > 0 ||
          documents.resume.skillGroups.some((g) => g.items.length > 0));
      if (hasSubstance) continue;
      await stage({
        kind: 'data-gap',
        title: `Complete the profile of ${talent.name}`,
        rationale: 'No skills and no documents on file — matching cannot score this talent.',
        talentId: talent.id,
        payload: {},
      });
    }
  }

  /** Accept a suggestion — applies its action (if any) and resolves it. */
  async accept(scope: string, id: string): Promise<AssistantSuggestion> {
    const suggestion = await this.requireProposed(scope, id);
    if (suggestion.kind === 'shortlist-add' && suggestion.mandateId && suggestion.talentId) {
      await this.addToPipeline(scope, suggestion.mandateId, suggestion.talentId, false);
    } else if (suggestion.kind === 'application' && suggestion.talentId) {
      await this.autopilot.approve(scope, suggestion);
    }
    const resolved: AssistantSuggestion = {
      ...suggestion,
      status: 'accepted',
      resolvedAt: this.clock.isoNow(),
    };
    await this.suggestions.update(resolved);
    return resolved;
  }

  /** Dismiss a suggestion — it will not be proposed again. */
  async dismiss(scope: string, id: string): Promise<AssistantSuggestion> {
    const suggestion = await this.requireProposed(scope, id);
    const resolved: AssistantSuggestion = {
      ...suggestion,
      status: 'dismissed',
      resolvedAt: this.clock.isoNow(),
    };
    await this.suggestions.update(resolved);
    return resolved;
  }

  /** Render the Bewerbungsmappe for a staged application (any status). */
  async renderApplicationDossier(scope: string, id: string): Promise<Buffer> {
    const suggestion = await this.suggestions.findById(scope, id);
    if (!suggestion || suggestion.kind !== 'application' || !suggestion.talentId) {
      throw new NotFoundError(`Application ${id} not found`);
    }
    return this.autopilot.renderDossier(scope, suggestion);
  }

  private async requireProposed(scope: string, id: string): Promise<AssistantSuggestion> {
    const suggestion = await this.suggestions.findById(scope, id);
    if (!suggestion) throw new NotFoundError(`Suggestion ${id} not found`);
    if (suggestion.status !== 'proposed') {
      throw new ConflictError('Suggestion is already resolved');
    }
    return suggestion;
  }

  private async addToPipeline(
    scope: string,
    mandateId: string,
    talentId: string,
    autoApplied: boolean,
  ): Promise<void> {
    try {
      await this.candidacyService.add(scope, mandateId, {
        talentId,
        stage: 'sourced',
        note: autoApplied ? 'Added by the assistant' : 'Added via assistant suggestion',
      });
    } catch (err) {
      // Someone added the talent meanwhile — accepting is then a no-op, not an error.
      if (!(err instanceof ConflictError)) throw err;
    }
  }
}
