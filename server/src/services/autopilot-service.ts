import {
  type AssistantSettings,
  type AssistantSuggestion,
  type ApplicationPayload,
  applicationDedupKey,
  applicationPayloadSchema,
  parseApplicationPayload,
  toSuggestionPayload,
} from '../domain/assistant.js';
import {
  type ApplicationTarget,
  mandateToTarget,
  jobToTarget,
} from '../domain/application-target.js';
import { jobQuerySchema } from '../domain/job.js';
import { createMandateSchema } from '../domain/mandate.js';
import type { AssistantSuggestionRepository } from '../ports/assistant-store.js';
import type { MandateRepository } from '../ports/mandate-repository.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type { Logger } from '../ports/logger.js';
import type { MatchService } from './match-service.js';
import type { CandidacyService } from './candidacy-service.js';
import type { MandateService } from './mandate-service.js';
import type { JobSearchService } from './job-search-service.js';
import type { ApplicationBuilder } from './application-builder.js';

export interface AutopilotServiceDeps {
  assistantSuggestionRepository: AssistantSuggestionRepository;
  mandateRepository: MandateRepository;
  matchService: MatchService;
  candidacyService: CandidacyService;
  mandateService: MandateService;
  jobSearchService: JobSearchService;
  applicationBuilder: ApplicationBuilder;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
}

/** Bounds autopilot's token spend per run: at most this many packets are built. */
const BUILD_LIMIT = 5;
/** How many openings/candidates autopilot considers before the build cap. */
const TARGET_LIMIT = 10;
const MATCH_LIMIT = 3;

/**
 * The auto-apply gear of the one agent (ADR-0019), split out of the assistant's
 * deterministic playbook so the token-spending orchestration lives on its own.
 * The assistant calls `propose` in `autopilot` mode to stage full application
 * packets, `approve` to turn a staged packet into a pipeline candidacy, and
 * `renderDossier` to produce the Bewerbungsmappe from a staged snapshot. Nothing
 * outward-facing is ever done here — approving only stages the candidate.
 */
export class AutopilotService {
  private readonly suggestions: AssistantSuggestionRepository;
  private readonly mandates: MandateRepository;
  private readonly match: MatchService;
  private readonly candidacyService: CandidacyService;
  private readonly mandateService: MandateService;
  private readonly jobs: JobSearchService;
  private readonly builder: ApplicationBuilder;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly logger: Logger;

  constructor(deps: AutopilotServiceDeps) {
    this.suggestions = deps.assistantSuggestionRepository;
    this.mandates = deps.mandateRepository;
    this.match = deps.matchService;
    this.candidacyService = deps.candidacyService;
    this.mandateService = deps.mandateService;
    this.jobs = deps.jobSearchService;
    this.builder = deps.applicationBuilder;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
    this.logger = deps.logger;
  }

  /**
   * The autopilot pass: pull openings from the configured source (received job
   * postings or own mandates), rank the pool against each, and for the strong,
   * not-yet-applied matches build a tailored application packet and stage it.
   * Bounded per run so token spend stays predictable; dedup keeps it from
   * rebuilding an application it already staged. Returns the count staged.
   */
  async propose(
    scope: string,
    settings: AssistantSettings,
    runId: string,
    now: string,
  ): Promise<number> {
    // Scan already-staged applications to avoid rebuilding one. This is a batch
    // read, so a single malformed/legacy record is skipped (logged) rather than
    // allowed to abort the whole run.
    const seenApps = new Set<string>();
    for (const s of await this.suggestions.list(scope)) {
      if (s.kind !== 'application') continue;
      const parsed = applicationPayloadSchema.safeParse(s.payload);
      if (!parsed.success) {
        this.logger.warn(
          { suggestionId: s.id },
          'skipping malformed application payload in dedup scan',
        );
        continue;
      }
      seenApps.add(applicationDedupKey(parsed.data.targetRef, s.talentId ?? ''));
    }
    const targets = await this.targets(scope, settings);
    let built = 0;
    let proposed = 0;

    for (const target of targets) {
      if (built >= BUILD_LIMIT) break;
      const matches = await this.rankForTarget(scope, target, MATCH_LIMIT);
      for (const m of matches) {
        if (built >= BUILD_LIMIT) break;
        if (m.inPipeline || m.score < settings.minApplyScore) continue;
        const key = applicationDedupKey(target.ref, m.talentId);
        if (seenApps.has(key)) continue;
        seenApps.add(key);

        let payload: ApplicationPayload;
        try {
          payload = await this.builder.build(scope, scope, target, m.talentId, m.score);
        } catch (err) {
          this.logger.warn(
            { targetRef: target.ref, err: err instanceof Error ? err.message : String(err) },
            'autopilot application build failed, skipping',
          );
          continue;
        }
        built += 1;

        const suggestion: AssistantSuggestion = {
          id: this.ids.next(),
          ownerId: scope,
          kind: 'application',
          title: `Apply ${m.name} → ${target.company} — ${target.role}`,
          rationale:
            `Match ${m.score}/100; tailored CV + cover letter in ` +
            `${payload.lang.toUpperCase()} ready` +
            (payload.ungroundedCount
              ? `; ⚠ ${payload.ungroundedCount} unverified claim(s) to review`
              : ''),
          ...(payload.mandateId ? { mandateId: payload.mandateId } : {}),
          talentId: m.talentId,
          payload: toSuggestionPayload(payload),
          status: 'proposed',
          createdAt: now,
          runId,
        };
        await this.suggestions.add(suggestion);
        proposed += 1;
      }
    }
    return proposed;
  }

  /** The openings autopilot applies to, normalized from the configured source. */
  private async targets(scope: string, settings: AssistantSettings): Promise<ApplicationTarget[]> {
    if (settings.applySource === 'mandates') {
      return (await this.mandates.list(scope))
        .filter((m) => m.status === 'active')
        .slice(0, TARGET_LIMIT)
        .map(mandateToTarget);
    }
    // Received job postings from the boards (offline sample when none are live).
    const result = await this.jobs.search(jobQuerySchema.parse({ threshold: 0 }));
    return [...result.top, ...result.more].slice(0, TARGET_LIMIT).map(jobToTarget);
  }

  /** Rank the pool against a target (mandate path knows the pipeline; job path doesn't). */
  private async rankForTarget(scope: string, target: ApplicationTarget, limit: number) {
    return target.source === 'mandates'
      ? this.match.rankForMandate(scope, target.ref, target.jobText, limit)
      : this.match.rankForJobText(scope, target.jobText, limit);
  }

  /**
   * Approve a staged application: put the candidate into the pipeline. For a
   * job-board opening the posting is first materialized into a mandate (the same
   * "mandate from a posting" path), so from here on there is exactly one
   * downstream flow. The actual outward submission stays a manual step.
   */
  async approve(scope: string, suggestion: AssistantSuggestion): Promise<void> {
    const payload = parseApplicationPayload(suggestion.payload);
    let mandateId = payload.mandateId;
    if (!mandateId) {
      const mandate = await this.mandateService.create(
        scope,
        createMandateSchema.parse({
          client: payload.company || 'Unknown company',
          role: payload.role || 'Role',
          location: payload.location || '—',
          jobText: payload.jobText,
        }),
      );
      mandateId = mandate.id;
    }
    await this.addToPipeline(scope, mandateId, suggestion.talentId as string);
  }

  /** Render the Bewerbungsmappe for a staged application from its snapshot. */
  async renderDossier(scope: string, suggestion: AssistantSuggestion): Promise<Buffer> {
    return this.builder.renderDossier(
      scope,
      suggestion.talentId as string,
      parseApplicationPayload(suggestion.payload),
    );
  }

  private async addToPipeline(scope: string, mandateId: string, talentId: string): Promise<void> {
    await this.candidacyService.addIfAbsent(scope, mandateId, {
      talentId,
      stage: 'sourced',
      note: 'Added via assistant suggestion',
    });
  }
}
