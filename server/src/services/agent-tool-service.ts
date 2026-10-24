import { ValidationError } from '../domain/errors.js';
import { isGroundingClean } from '../domain/chat-agent.js';
import { scoreTalent } from '../domain/match.js';
import type { GroundingReport } from '../domain/grounding.js';
import type { PenSuggestion } from '../domain/magic-pen.js';
import type { ResumeSkillGroup, TalentDocuments } from '../domain/talent-documents.js';
import type { AgentTool } from '../ports/agent-llm-provider.js';
import type { TalentRepository } from '../ports/talent-repository.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { JobSearchService } from './job-search-service.js';
import type { JobPostingService } from './job-posting-service.js';
import type { JobPostingExtractService } from './job-posting-extract-service.js';
import type { TalentService } from './talent-service.js';
import type { MatchService } from './match-service.js';
import type { JobApplicationService } from './job-application-service.js';
import type { ApplicationLetterService } from './application-letter-service.js';
import type { MagicPenService } from './magic-pen-service.js';

export interface AgentToolServiceDeps {
  jobSearchService: JobSearchService;
  jobPostingService: JobPostingService;
  jobPostingExtractService: JobPostingExtractService;
  talentService: TalentService;
  /** Nullable (Owner Q4): `assess_fit` degrades to pure skill overlap without it. */
  matchService: MatchService | null;
  talentRepository: TalentRepository;
  documentRepository: DocumentRepository;
  jobApplicationService: JobApplicationService;
  applicationLetterService: ApplicationLetterService;
  magicPenService: MagicPenService;
}

const DRAFT_ONLY =
  'You may only create draft applications. Never send, delete, change status ' +
  'beyond draft, unfreeze, or select attachments.';

/** The closed registry of the nine tools (AK-5.2) — no forbidden action exists as a tool. */
export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'search_jobs',
    description: `Search live job boards. ${DRAFT_ONLY}`,
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
        limit: { type: 'integer', default: 20 },
      },
      required: ['q'],
    },
  },
  {
    name: 'save_job',
    description: `Save one job posting (adopt a search result, extract from a URL, or create from fields). ${DRAFT_ONLY}`,
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        sourceId: { type: 'string' },
        url: { type: 'string' },
        company: { type: 'string' },
        title: { type: 'string' },
        location: { type: 'string' },
        country: { type: 'string' },
        requirements: { type: 'array', items: { type: 'string' } },
        description: { type: 'string' },
      },
      required: ['source'],
    },
  },
  {
    name: 'list_mandanten',
    description: `List the talent pool (Mandanten) in this workspace. ${DRAFT_ONLY}`,
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'assess_fit',
    description: `Rank the talent pool against a job-ad text (deterministic, no LLM). ${DRAFT_ONLY}`,
    inputSchema: {
      type: 'object',
      properties: {
        jobText: { type: 'string' },
        limit: { type: 'integer', default: 10 },
      },
      required: ['jobText'],
    },
  },
  {
    name: 'create_application',
    description: `Create a draft job application for (posting, talent). ${DRAFT_ONLY}`,
    inputSchema: {
      type: 'object',
      properties: {
        jobPostingId: { type: 'string' },
        talentId: { type: 'string' },
      },
      required: ['jobPostingId', 'talentId'],
    },
  },
  {
    name: 'list_applications',
    description: `List the draft job applications in this workspace. ${DRAFT_ONLY}`,
    inputSchema: {
      type: 'object',
      properties: { talentId: { type: 'string' } },
    },
  },
  {
    name: 'generate_letter',
    description: `Generate an Anschreiben for a draft application and persist it into the draft copy. ${DRAFT_ONLY}`,
    inputSchema: {
      type: 'object',
      properties: { jobApplicationId: { type: 'string' } },
      required: ['jobApplicationId'],
    },
  },
  {
    name: 'tailor_section',
    description: `Rewrite one CV section of a draft application; persist only when grounding is clean. ${DRAFT_ONLY}`,
    inputSchema: {
      type: 'object',
      properties: {
        jobApplicationId: { type: 'string' },
        section: {
          type: 'string',
          enum: ['headline', 'summary', 'experienceBullets', 'skills'],
        },
        experienceIndex: { type: 'integer' },
      },
      required: ['jobApplicationId', 'section'],
    },
  },
  {
    name: 'tailor_all',
    description: `Rewrite every CV section + letter of a draft application; persist every clean section. ${DRAFT_ONLY}`,
    inputSchema: {
      type: 'object',
      properties: { jobApplicationId: { type: 'string' } },
      required: ['jobApplicationId'],
    },
  },
];

function str(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

/**
 * The nine tool handlers (ADR-0062 §4): thin wrappers over the Phase 1–4
 * services — no logic of their own beyond the grounding-gated persist into the
 * draft copy. Forbidden actions (send, delete, status change, unfreeze,
 * attachments) are deliberately **not** reachable: this service is constructed
 * only with the allowed services and exposes exactly the nine names above.
 */
export class AgentToolService {
  private readonly search: JobSearchService;
  private readonly postings: JobPostingService;
  private readonly extract: JobPostingExtractService;
  private readonly talents: TalentService;
  private readonly match: MatchService | null;
  private readonly talentRepo: TalentRepository;
  private readonly documents: DocumentRepository;
  private readonly applications: JobApplicationService;
  private readonly letterService: ApplicationLetterService;
  private readonly pen: MagicPenService;

  constructor(deps: AgentToolServiceDeps) {
    this.search = deps.jobSearchService;
    this.postings = deps.jobPostingService;
    this.extract = deps.jobPostingExtractService;
    this.talents = deps.talentService;
    this.match = deps.matchService;
    this.talentRepo = deps.talentRepository;
    this.documents = deps.documentRepository;
    this.applications = deps.jobApplicationService;
    this.letterService = deps.applicationLetterService;
    this.pen = deps.magicPenService;
  }

  async dispatch(scope: string, userId: string, name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'search_jobs':
        return this.searchJobs(scope, args as SearchJobsArgs);
      case 'save_job':
        return this.saveJob(scope, userId, args as SaveJobArgs);
      case 'list_mandanten':
        return this.listMandanten(scope);
      case 'assess_fit':
        return this.assessFit(scope, args as AssessFitArgs);
      case 'create_application':
        return this.createApplication(scope, args as CreateApplicationArgs);
      case 'list_applications':
        return this.listApplications(scope, args as ListApplicationsArgs);
      case 'generate_letter':
        return this.generateLetter(scope, userId, args as IdArgs);
      case 'tailor_section':
        return this.tailorSection(scope, userId, args as TailorSectionArgs);
      case 'tailor_all':
        return this.tailorAll(scope, userId, args as IdArgs);
      default:
        throw new ValidationError(`Unknown agent tool: ${name}`);
    }
  }

  private async searchJobs(scope: string, args: SearchJobsArgs): Promise<unknown> {
    const limit = Math.max(1, Number(args.limit) || 20);
    const result = await this.search.search({
      q: str(args.q),
      ...(args.city ? { city: str(args.city) } : {}),
      ...(args.country ? { country: str(args.country) } : {}),
      threshold: 80,
    });
    const jobs = [...result.top, ...result.more].slice(0, limit).map((j) => ({
      id: j.id,
      company: j.company,
      title: j.role,
      city: j.city,
      country: j.country,
      source: j.source,
      ...(j.url ? { url: j.url } : {}),
      skills: j.skills,
      ...(j.snippet ? { snippet: j.snippet } : {}),
      match: j.match,
    }));
    return { jobs, ...(result.liveSourcesDown ? { liveSourcesDown: true } : {}) };
  }

  private async saveJob(scope: string, userId: string, args: SaveJobArgs): Promise<unknown> {
    const sourceId = args.sourceId ? str(args.sourceId) : undefined;
    const url = args.url ? str(args.url) : undefined;
    if (sourceId) {
      const { jobPosting, alreadySaved } = await this.postings.adopt(scope, {
        source: str(args.source),
        sourceId,
        ...(url ? { url } : {}),
        company: str(args.company),
        title: str(args.title),
        location: str(args.location),
        country: str(args.country),
        requirements: stringList(args.requirements),
      });
      return { jobPostingId: jobPosting.id, alreadySaved };
    }

    const hasFields = Boolean(
      args.company ||
      args.title ||
      args.location ||
      args.country ||
      stringList(args.requirements).length > 0 ||
      args.description,
    );
    if (url && !hasFields) {
      // URL only → SSRF-guarded fetch + AI extraction, then persist (AK-1.3/1.5).
      const draft = await this.extract.fromUrl(userId, url);
      const { jobPosting, alreadySaved } = await this.postings.create(scope, {
        source: draft.source,
        ...(draft.url ? { url: draft.url } : { url }),
        company: draft.company,
        title: draft.title,
        location: draft.location,
        country: draft.country,
        requirements: draft.requirements,
        description: draft.description,
      });
      return { jobPostingId: jobPosting.id, alreadySaved };
    }

    const { jobPosting, alreadySaved } = await this.postings.create(scope, {
      source: str(args.source),
      ...(sourceId ? { sourceId } : {}),
      ...(url ? { url } : {}),
      company: str(args.company),
      title: str(args.title),
      location: str(args.location),
      country: str(args.country),
      requirements: stringList(args.requirements),
      description: str(args.description),
    });
    return { jobPostingId: jobPosting.id, alreadySaved };
  }

  private async listMandanten(scope: string): Promise<unknown> {
    const talents = await this.talents.listWithSkills(scope);
    return talents
      .filter((t) => !t.anonymizedAt)
      .map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        headline: t.headline,
        location: t.location,
        skills: t.effectiveSkills,
      }));
  }

  private async assessFit(scope: string, args: AssessFitArgs): Promise<unknown> {
    const limit = Math.max(1, Number(args.limit) || 10);
    const jobText = str(args.jobText);
    if (this.match) {
      const matches = await this.match.rankForJobText(scope, jobText, limit);
      return matches.map((m) => ({
        talentId: m.talentId,
        name: m.name,
        role: m.role,
        location: m.location,
        score: m.score,
        matched: m.matched,
      }));
    }
    // Owner Q4 fallback: MatchService not wired → pure skill overlap, no embeddings.
    const talents = await this.talentRepo.list(scope);
    const ranked = await Promise.all(
      talents
        .filter((t) => !t.anonymizedAt)
        .map(async (t) => {
          const docs = await this.documents.get(scope, t.id);
          const { score, matched } = scoreTalent(t, docs, jobText);
          return {
            talentId: t.id,
            name: t.name,
            role: t.role,
            location: t.location,
            score,
            matched,
          };
        }),
    );
    return ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
  }

  private async createApplication(scope: string, args: CreateApplicationArgs): Promise<unknown> {
    const { jobApplication, alreadyExisting } = await this.applications.create(scope, {
      jobPostingId: str(args.jobPostingId),
      talentId: str(args.talentId),
    });
    return {
      jobApplicationId: jobApplication.id,
      alreadyExisting,
      status: 'draft',
      postingCompany: jobApplication.postingCompany,
      postingTitle: jobApplication.postingTitle,
      talentName: jobApplication.talentName,
    };
  }

  private async listApplications(scope: string, args: ListApplicationsArgs): Promise<unknown> {
    const talentId = args.talentId ? str(args.talentId) : undefined;
    const applications = await this.applications.list(scope, talentId, 'draft');
    return applications.map((a) => ({
      id: a.id,
      postingCompany: a.postingCompany,
      postingTitle: a.postingTitle,
      talentId: a.talentId,
      talentName: a.talentName,
      status: a.status,
      createdAt: a.createdAt,
    }));
  }

  private async generateLetter(scope: string, userId: string, args: IdArgs): Promise<unknown> {
    const applicationId = str(args.jobApplicationId);
    const { letter } = await this.letterService.generate(scope, userId, applicationId);
    const clean = isGroundingClean(letter.grounding as GroundingReport);
    if (clean) await this.persistLetter(scope, applicationId, letter.paragraphs);
    return {
      applied: clean,
      paragraphs: letter.paragraphs,
      checks: letter.checks,
      grounding: letter.grounding,
    };
  }

  private async tailorSection(
    scope: string,
    userId: string,
    args: TailorSectionArgs,
  ): Promise<unknown> {
    const applicationId = str(args.jobApplicationId);
    const section = args.section;
    const suggestion = await this.pen.rewriteSection(scope, userId, applicationId, section, {
      ...(args.experienceIndex !== undefined
        ? { experienceIndex: Number(args.experienceIndex) }
        : {}),
    });
    const clean = isGroundingClean(suggestion.grounding);
    if (clean) await this.applySuggestionToCopy(scope, applicationId, suggestion);
    return {
      section: suggestion.section,
      before: suggestion.before,
      after: suggestion.after,
      applied: clean,
      grounding: suggestion.grounding,
      ...(suggestion.experienceIndex !== undefined
        ? { experienceIndex: suggestion.experienceIndex }
        : {}),
      ...(suggestion.station ? { station: suggestion.station } : {}),
    };
  }

  private async tailorAll(scope: string, userId: string, args: IdArgs): Promise<unknown> {
    const applicationId = str(args.jobApplicationId);
    const result = await this.pen.rewriteAll(scope, userId, applicationId);
    const sections: unknown[] = [];
    let applied = 0;
    let warnings = 0;
    for (const entry of result.sections) {
      if ('error' in entry) {
        sections.push({ error: entry.error });
        warnings += 1;
        continue;
      }
      const clean = isGroundingClean(entry.grounding);
      if (entry.section === 'letter') {
        if (clean) {
          await this.persistLetter(scope, applicationId, entry.after);
          applied += 1;
        } else {
          warnings += 1;
        }
        sections.push({ section: 'letter', applied: clean, grounding: entry.grounding });
      } else {
        if (clean) {
          await this.applySuggestionToCopy(scope, applicationId, entry);
          applied += 1;
        } else {
          warnings += 1;
        }
        sections.push({
          section: entry.section,
          before: entry.before,
          after: entry.after,
          applied: clean,
          grounding: entry.grounding,
          ...(entry.experienceIndex !== undefined
            ? { experienceIndex: entry.experienceIndex }
            : {}),
        });
      }
    }
    return { sections, applied, warnings };
  }

  private async persistLetter(
    scope: string,
    applicationId: string,
    paragraphs: string[],
  ): Promise<void> {
    await this.persistDocuments(scope, applicationId, (docs) => ({
      ...docs,
      letter: { ...docs.letter, absaetze: [...paragraphs] },
    }));
  }

  /** Persist a clean Magic-Pen suggestion into the draft copy (AK-5.1). */
  private async applySuggestionToCopy(
    scope: string,
    applicationId: string,
    suggestion: PenSuggestion,
  ): Promise<void> {
    await this.persistDocuments(scope, applicationId, (docs) => {
      const next = structuredClone(docs);
      switch (suggestion.section) {
        case 'headline':
          next.contact.role = suggestion.after as string;
          break;
        case 'summary':
          next.resume.summary = suggestion.after as string;
          break;
        case 'experienceBullets':
          next.resume.experience[suggestion.experienceIndex ?? 0]!.bullets =
            suggestion.after as string[];
          break;
        case 'skills':
          next.resume.skillGroups = suggestion.after as ResumeSkillGroup[];
          break;
      }
      return next;
    });
  }

  private async persistDocuments(
    scope: string,
    applicationId: string,
    mutate: (docs: TalentDocuments) => TalentDocuments,
  ): Promise<void> {
    const application = await this.applications.get(scope, applicationId);
    const docs = mutate(application.documents);
    const { contact, resume, letter, style } = docs;
    await this.applications.saveDocuments(scope, applicationId, { contact, resume, letter, style });
  }
}

interface SearchJobsArgs {
  q?: unknown;
  city?: unknown;
  country?: unknown;
  limit?: unknown;
}
interface SaveJobArgs {
  source?: unknown;
  sourceId?: unknown;
  url?: unknown;
  company?: unknown;
  title?: unknown;
  location?: unknown;
  country?: unknown;
  requirements?: unknown;
  description?: unknown;
}
interface AssessFitArgs {
  jobText?: unknown;
  limit?: unknown;
}
interface CreateApplicationArgs {
  jobPostingId?: unknown;
  talentId?: unknown;
}
interface ListApplicationsArgs {
  talentId?: unknown;
}
interface IdArgs {
  jobApplicationId?: unknown;
}
interface TailorSectionArgs extends IdArgs {
  section: 'headline' | 'summary' | 'experienceBullets' | 'skills';
  experienceIndex?: unknown;
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((s) => str(s)).filter((s) => s !== '') : [];
}
