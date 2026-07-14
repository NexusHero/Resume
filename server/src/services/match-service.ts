import { type TalentMatch, scoreTalent, hybridScore, matchText } from '../domain/match.js';
import { similarityScore } from '../domain/embedding.js';
import { NotFoundError } from '../domain/errors.js';
import type { Talent } from '../domain/talent.js';
import type { TalentDocuments } from '../domain/talent-documents.js';
import type { MandateRepository } from '../ports/mandate-repository.js';
import type { TalentRepository } from '../ports/talent-repository.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { CandidacyRepository } from '../ports/candidacy-repository.js';
import type { EmbeddingProvider } from '../ports/embedding-provider.js';

export interface MatchServiceDeps {
  mandateRepository: MandateRepository;
  talentRepository: TalentRepository;
  documentRepository: DocumentRepository;
  candidacyRepository: CandidacyRepository;
  embeddingProvider: EmbeddingProvider;
}

/**
 * Mandate → shortlist: rank the shared talent pool against a mandate so the
 * recruiter turns a search into a ranked candidate list in one step. Scoring
 * is deterministic and hybrid (ADR-0017): the skill/ontology score carries
 * the ranking, embedding similarity between ad and profile text breaks ties
 * and rescues candidates whose fit lives in their bullets, not their skill
 * list. The caller can then add the top picks to the pipeline and generate
 * dossier/pitch/outreach from them.
 */
export class MatchService {
  private readonly mandates: MandateRepository;
  private readonly talents: TalentRepository;
  private readonly documents: DocumentRepository;
  private readonly candidacies: CandidacyRepository;
  private readonly embeddings: EmbeddingProvider;

  /**
   * A talent's profile embedding is a pure function of their own record +
   * documents — it does not depend on the query being ranked against, so
   * recomputing it on every `rankPool` call (once per mandate, per scheduled
   * assistant run) was pure waste, amplified by pool size × active mandates.
   * Cached per `scope:talentId`, invalidated by a version key built from both
   * `updatedAt` timestamps (`matchText` reads fields from both), so an edited
   * profile or CV is re-embedded on the very next rank; a stale profile never
   * is. Process-lifetime only (a fresh instance starts cold); `rankPool`
   * prunes entries for talents no longer in the pool on every call, so a
   * deleted talent's cache entry doesn't linger forever.
   */
  private readonly profileVectorCache = new Map<string, { version: string; vector: number[] }>();

  constructor(deps: MatchServiceDeps) {
    this.mandates = deps.mandateRepository;
    this.talents = deps.talentRepository;
    this.documents = deps.documentRepository;
    this.candidacies = deps.candidacyRepository;
    this.embeddings = deps.embeddingProvider;
  }

  async rankForMandate(
    scope: string,
    mandateId: string,
    jobText: string,
    limit: number,
  ): Promise<TalentMatch[]> {
    const mandate = await this.mandates.findById(scope, mandateId);
    if (!mandate) throw new NotFoundError(`Mandate ${mandateId} not found`);

    // Fall back to matching on the mandate itself when no ad text is given.
    const query = jobText.trim() || `${mandate.role} ${mandate.location}`;
    const pipeline = await this.candidacies.listForMandate(scope, mandateId);
    const inPipeline = new Set(pipeline.map((c) => c.talentId));
    return this.rankPool(scope, query, limit, inPipeline);
  }

  /**
   * Rank the pool against arbitrary job-ad text — the mandate-free path the
   * auto-apply agent uses for postings received from the boards (ADR-0019).
   * There is no pipeline to check, so `inPipeline` is always false.
   */
  async rankForJobText(scope: string, jobText: string, limit: number): Promise<TalentMatch[]> {
    return this.rankPool(scope, jobText.trim(), limit, new Set());
  }

  /** The shared hybrid ranking: skills/ontology score + embedding similarity. */
  private async rankPool(
    scope: string,
    query: string,
    limit: number,
    inPipeline: Set<string>,
  ): Promise<TalentMatch[]> {
    const queryVector = await this.embeddings.embed(query);
    const talents = await this.talents.list(scope);
    this.prunePool(scope, talents);
    const matches = await Promise.all(
      talents
        .filter((t) => !t.anonymizedAt) // no identifiable data to present
        .map(async (t) => {
          const documents = await this.documents.get(scope, t.id);
          const { score: skillScore, matched } = scoreTalent(t, documents, query);
          const profileVector = await this.profileVector(scope, t, documents);
          const semanticScore = similarityScore(queryVector, profileVector);
          return {
            talentId: t.id,
            name: t.name,
            role: t.role,
            location: t.location,
            score: hybridScore(skillScore, semanticScore),
            skillScore,
            semanticScore,
            matched,
            inPipeline: inPipeline.has(t.id),
          };
        }),
    );

    return matches
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  /** A talent's profile embedding, from cache when neither the talent record
      nor their documents have changed since it was last computed. */
  private async profileVector(
    scope: string,
    talent: Talent,
    documents: TalentDocuments | null,
  ): Promise<number[]> {
    const key = `${scope}:${talent.id}`;
    const version = `${talent.updatedAt}|${documents?.updatedAt ?? ''}`;
    const cached = this.profileVectorCache.get(key);
    if (cached && cached.version === version) return cached.vector;
    const vector = await this.embeddings.embed(matchText(talent, documents));
    this.profileVectorCache.set(key, { version, vector });
    return vector;
  }

  /** Drop cache entries for talents no longer in the pool (removed/moved scope). */
  private prunePool(scope: string, talents: Talent[]): void {
    const prefix = `${scope}:`;
    const alive = new Set(talents.map((t) => `${prefix}${t.id}`));
    for (const key of this.profileVectorCache.keys()) {
      if (key.startsWith(prefix) && !alive.has(key)) this.profileVectorCache.delete(key);
    }
  }
}
