import type { Application, AuditEvent } from '../../src/domain/application.js';
import type { ApplicationRepository } from '../../src/ports/application-repository.js';
import type { AuditLog } from '../../src/ports/audit-log.js';
import type { PdfArchive } from '../../src/ports/pdf-archive.js';
import type { CoverLetterOptions, PdfRenderer } from '../../src/ports/pdf-renderer.js';
import type { PdfMerger } from '../../src/ports/pdf-merger.js';
import type { PdfTextExtractor } from '../../src/ports/pdf-text-extractor.js';
import type { Versioner } from '../../src/ports/versioner.js';
import type { Clock } from '../../src/ports/clock.js';
import type { IdGenerator } from '../../src/ports/id-generator.js';
import type { Logger } from '../../src/ports/logger.js';
import type { SkillExtractor } from '../../src/ports/skill-extractor.js';
import type { JobSource } from '../../src/ports/job-source.js';
import type { Job, JobQuery } from '../../src/domain/job.js';
import type { SavedSearch } from '../../src/domain/saved-search.js';
import type { SavedSearchRepository } from '../../src/ports/saved-search-repository.js';
import type { Mandate } from '../../src/domain/mandate.js';
import type { MandateRepository } from '../../src/ports/mandate-repository.js';
import type { Talent } from '../../src/domain/talent.js';
import type { TalentRepository } from '../../src/ports/talent-repository.js';
import type { Placement } from '../../src/domain/placement.js';
import type { PlacementRepository } from '../../src/ports/placement-repository.js';
import type { Candidacy } from '../../src/domain/candidacy.js';
import type { CandidacyRepository } from '../../src/ports/candidacy-repository.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';
import type { DocumentRepository } from '../../src/ports/document-repository.js';
import type { Attachment } from '../../src/domain/attachment.js';
import type { AttachmentBlob, AttachmentStore } from '../../src/ports/attachment-store.js';
import type { User, Role } from '../../src/domain/user.js';
import type { UserRepository } from '../../src/ports/user-repository.js';
import type { AuthEngine, AuthEngineSession, AuthEngineUser } from '../../src/ports/auth-engine.js';
import type { PasswordResetTokenStore } from '../../src/ports/password-reset-token-store.js';
import type { EmailVerificationTokenStore } from '../../src/ports/email-verification-token-store.js';
import type { InviteRepository } from '../../src/ports/invite-repository.js';
import type { TenantInvite } from '../../src/domain/tenant-invite.js';
import type { TenantRepository } from '../../src/ports/tenant-repository.js';
import type { Tenant, TenantStatus } from '../../src/domain/tenant.js';
import type { Mailer, MailMessage } from '../../src/ports/mailer.js';
import type { InboxSource } from '../../src/ports/inbox-source.js';
import type { StageTransitionRepository } from '../../src/ports/stage-transition-repository.js';
import type { RetentionPolicyStore } from '../../src/ports/retention-policy-store.js';
import type { RetentionPolicy } from '../../src/domain/retention.js';
import type { StageTransition } from '../../src/domain/stage-history.js';
import type { InboxMessage } from '../../src/domain/mail-sync.js';
import type { ApiKeyStore } from '../../src/ports/api-key-store.js';
import type { LlmProviderId } from '../../src/ports/llm-provider.js';
import type { UsageMeter } from '../../src/ports/usage-meter.js';
import type { UsageEvent } from '../../src/domain/usage.js';
import type { InterviewObservationRepository } from '../../src/ports/interview-observation-repository.js';
import type {
  AssistantSettingsStore,
  AssistantSuggestionRepository,
} from '../../src/ports/assistant-store.js';
import type { AssistantSettings, AssistantSuggestion } from '../../src/domain/assistant.js';
import type { ArtifactLog } from '../../src/domain/artifact.js';
import type { ArtifactLogRepository } from '../../src/ports/artifact-log-repository.js';
import type { InterviewObservation } from '../../src/domain/interview-observation.js';

export class InMemoryApplicationRepository implements ApplicationRepository {
  apps: Application[] = [];
  async list(ownerId: string): Promise<Application[]> {
    return this.apps.filter((a) => a.ownerId === ownerId).map((a) => ({ ...a }));
  }
  async findById(ownerId: string, id: string): Promise<Application | null> {
    return this.apps.find((a) => a.id === id && a.ownerId === ownerId) ?? null;
  }
  async add(application: Application): Promise<void> {
    this.apps.push(application);
  }
  async update(application: Application): Promise<void> {
    const i = this.apps.findIndex(
      (a) => a.id === application.id && a.ownerId === application.ownerId,
    );
    if (i < 0) this.apps.push(application);
    else this.apps[i] = application;
  }
}

export class InMemoryAuditLog implements AuditLog {
  events: AuditEvent[] = [];
  async append(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
  async list(): Promise<AuditEvent[]> {
    return [...this.events];
  }
}

export class InMemoryPdfArchive implements PdfArchive {
  saved: { name: string; bytes: Buffer }[] = [];
  async save(filenameHint: string, bytes: Buffer): Promise<string> {
    this.saved.push({ name: filenameHint, bytes });
    return `bewerbungen/${filenameHint}.pdf`;
  }
}

export class FakePdfRenderer implements PdfRenderer {
  lastCoverLetter?: CoverLetterOptions;
  lastHtml?: string;
  async renderCv(): Promise<Buffer> {
    return Buffer.from('cv');
  }
  async renderCoverLetter(options: CoverLetterOptions): Promise<Buffer> {
    this.lastCoverLetter = options;
    return Buffer.from('letter');
  }
  async renderHtml(html: string): Promise<Buffer> {
    this.lastHtml = html;
    return Buffer.from('pdf:' + html.length);
  }
}

export class FakePdfMerger implements PdfMerger {
  async merge(parts: Buffer[]): Promise<Buffer> {
    return Buffer.concat(parts);
  }
}

/** Returns canned text (or a preset error) instead of running pdf.js. */
export class FakePdfTextExtractor implements PdfTextExtractor {
  lastPdf?: Buffer;
  constructor(private readonly text: string | Error = '') {}
  async extract(pdf: Buffer): Promise<string> {
    this.lastPdf = pdf;
    if (this.text instanceof Error) throw this.text;
    return this.text;
  }
}

export class FakeVersioner implements Versioner {
  calls: string[] = [];
  constructor(private readonly hash: string | null = 'abc1234') {}
  async commit(message: string): Promise<string | null> {
    this.calls.push(message);
    return this.hash;
  }
}

export class FixedClock implements Clock {
  constructor(private readonly iso = '2026-06-25T10:00:00.000Z') {}
  now(): Date {
    return new Date(this.iso);
  }
  today(): string {
    return this.iso.slice(0, 10);
  }
  isoNow(): string {
    return this.iso;
  }
}

export class SequenceIdGenerator implements IdGenerator {
  private n = 0;
  constructor(private readonly prefix = 'id') {}
  next(): string {
    return `${this.prefix}${++this.n}`;
  }
}

export const noopLogger: Logger = {
  info() {},
  warn() {},
  error() {},
  debug() {},
};

/** A SkillExtractor that finds nothing — keeps tiering tests free of taxonomy effects. */
export const noopSkillExtractor: SkillExtractor = {
  extract: () => [],
};

/**
 * A deterministic JobSource for tests. Production ships NO sample/mock source
 * (job data comes from real boards like Arbeitnow); this fixture stands in so
 * job-search / autopilot tests stay deterministic and offline. Filters by the
 * query the same way a real board would, on role/company/skills.
 */
export class FakeJobSource implements JobSource {
  readonly name = 'Fake';
  constructor(private readonly jobs: Job[] = FAKE_JOBS) {}
  async search(query: JobQuery): Promise<Job[]> {
    const kw = query.q?.trim().toLowerCase();
    const country = query.country?.trim();
    return this.jobs
      .filter((j) => {
        if (country && j.country !== country) return false;
        if (kw) {
          const hay = `${j.role} ${j.company} ${j.skills.join(' ')}`.toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      })
      .map((j) => ({ ...j, skills: [...j.skills] }));
  }
}

const FAKE_JOBS: Job[] = [
  {
    // A strong fit for the default candidate profile (C++/Rust/Distributed
    // Systems…): scores above the 80 tier boundary so two-tier tests keep a
    // populated `top`.
    id: 'f1',
    company: 'Aurora Systems',
    role: 'Senior C++ Engineer',
    city: 'Berlin',
    country: 'DE',
    mode: 'hybrid',
    skills: ['C++', 'Rust', 'gRPC', 'Distributed Systems', 'Kubernetes', 'Go', 'AWS'],
    source: 'Fake',
  },
  {
    id: 'f2',
    company: 'Helio',
    role: 'Backend Engineer (Rust)',
    city: 'Remote',
    country: 'DE',
    mode: 'remote',
    skills: ['Rust', 'PostgreSQL'],
    source: 'Fake',
  },
  {
    // A deliberate stretch role, so the lower "more" tier is never empty.
    id: 'f3',
    company: 'Pixelworks',
    role: 'Frontend Engineer',
    city: 'Hamburg',
    country: 'DE',
    mode: 'hybrid',
    skills: ['React', 'TypeScript'],
    source: 'Fake',
  },
];

export class InMemorySavedSearchRepository implements SavedSearchRepository {
  searches: SavedSearch[] = [];
  async list(): Promise<SavedSearch[]> {
    return this.searches.map((s) => ({ ...s }));
  }
  async findById(id: string): Promise<SavedSearch | null> {
    return this.searches.find((s) => s.id === id) ?? null;
  }
  async add(search: SavedSearch): Promise<void> {
    this.searches.push(search);
  }
  async remove(id: string): Promise<boolean> {
    const before = this.searches.length;
    this.searches = this.searches.filter((s) => s.id !== id);
    return this.searches.length < before;
  }
}

export class InMemoryMandateRepository implements MandateRepository {
  mandates: Mandate[] = [];
  async list(ownerId: string): Promise<Mandate[]> {
    return this.mandates.filter((m) => m.ownerId === ownerId).map((m) => ({ ...m }));
  }
  async findById(ownerId: string, id: string): Promise<Mandate | null> {
    return this.mandates.find((m) => m.ownerId === ownerId && m.id === id) ?? null;
  }
  async add(mandate: Mandate): Promise<void> {
    this.mandates.push(mandate);
  }
  async update(mandate: Mandate): Promise<void> {
    const i = this.mandates.findIndex((m) => m.id === mandate.id);
    if (i < 0) this.mandates.push(mandate);
    else this.mandates[i] = mandate;
  }
  async remove(ownerId: string, id: string): Promise<boolean> {
    const before = this.mandates.length;
    this.mandates = this.mandates.filter((m) => !(m.ownerId === ownerId && m.id === id));
    return this.mandates.length < before;
  }
}

export class InMemoryTalentRepository implements TalentRepository {
  talents: Talent[] = [];
  async list(ownerId: string): Promise<Talent[]> {
    return this.talents.filter((t) => t.ownerId === ownerId).map((t) => ({ ...t }));
  }
  async findById(ownerId: string, id: string): Promise<Talent | null> {
    return this.talents.find((t) => t.ownerId === ownerId && t.id === id) ?? null;
  }
  async add(talent: Talent): Promise<void> {
    this.talents.push(talent);
  }
  async update(talent: Talent): Promise<void> {
    const i = this.talents.findIndex((t) => t.id === talent.id);
    if (i < 0) this.talents.push(talent);
    else this.talents[i] = talent;
  }
  async remove(ownerId: string, id: string): Promise<boolean> {
    const before = this.talents.length;
    this.talents = this.talents.filter((t) => !(t.ownerId === ownerId && t.id === id));
    return this.talents.length < before;
  }
}

export class InMemoryPlacementRepository implements PlacementRepository {
  placements: Placement[] = [];
  async list(ownerId: string): Promise<Placement[]> {
    return this.placements.filter((p) => p.ownerId === ownerId).map((p) => ({ ...p }));
  }
  async findById(ownerId: string, id: string): Promise<Placement | null> {
    return this.placements.find((p) => p.ownerId === ownerId && p.id === id) ?? null;
  }
  async add(placement: Placement): Promise<void> {
    this.placements.push(placement);
  }
  async update(placement: Placement): Promise<void> {
    const i = this.placements.findIndex((p) => p.id === placement.id);
    if (i < 0) this.placements.push(placement);
    else this.placements[i] = placement;
  }
  async remove(ownerId: string, id: string): Promise<boolean> {
    const before = this.placements.length;
    this.placements = this.placements.filter((p) => !(p.ownerId === ownerId && p.id === id));
    return this.placements.length < before;
  }
}

export class InMemoryCandidacyRepository implements CandidacyRepository {
  candidacies: Candidacy[] = [];
  async listForMandate(ownerId: string, mandateId: string): Promise<Candidacy[]> {
    return this.candidacies
      .filter((c) => c.ownerId === ownerId && c.mandateId === mandateId)
      .map((c) => ({ ...c }));
  }
  async listForTalent(ownerId: string, talentId: string): Promise<Candidacy[]> {
    return this.candidacies
      .filter((c) => c.ownerId === ownerId && c.talentId === talentId)
      .map((c) => ({ ...c }));
  }
  async findById(ownerId: string, id: string): Promise<Candidacy | null> {
    return this.candidacies.find((c) => c.ownerId === ownerId && c.id === id) ?? null;
  }
  async findByMandateAndTalent(
    ownerId: string,
    mandateId: string,
    talentId: string,
  ): Promise<Candidacy | null> {
    return (
      this.candidacies.find(
        (c) => c.ownerId === ownerId && c.mandateId === mandateId && c.talentId === talentId,
      ) ?? null
    );
  }
  async add(candidacy: Candidacy): Promise<void> {
    this.candidacies.push(candidacy);
  }
  async update(candidacy: Candidacy): Promise<void> {
    const i = this.candidacies.findIndex(
      (c) => c.ownerId === candidacy.ownerId && c.id === candidacy.id,
    );
    if (i >= 0) this.candidacies[i] = candidacy;
  }
  async remove(ownerId: string, id: string): Promise<boolean> {
    const before = this.candidacies.length;
    this.candidacies = this.candidacies.filter((c) => !(c.ownerId === ownerId && c.id === id));
    return this.candidacies.length < before;
  }
  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    this.candidacies = this.candidacies.filter(
      (c) => !(c.ownerId === ownerId && c.talentId === talentId),
    );
  }
  async removeForMandate(ownerId: string, mandateId: string): Promise<void> {
    this.candidacies = this.candidacies.filter(
      (c) => !(c.ownerId === ownerId && c.mandateId === mandateId),
    );
  }
  async removeForOwner(ownerId: string): Promise<void> {
    this.candidacies = this.candidacies.filter((c) => c.ownerId !== ownerId);
  }
}

export class InMemoryDocumentRepository implements DocumentRepository {
  documents: TalentDocuments[] = [];
  async get(ownerId: string, talentId: string): Promise<TalentDocuments | null> {
    return this.documents.find((d) => d.ownerId === ownerId && d.talentId === talentId) ?? null;
  }
  async save(documents: TalentDocuments): Promise<void> {
    const i = this.documents.findIndex(
      (d) => d.ownerId === documents.ownerId && d.talentId === documents.talentId,
    );
    if (i < 0) this.documents.push(documents);
    else this.documents[i] = documents;
  }
  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    this.documents = this.documents.filter(
      (d) => !(d.ownerId === ownerId && d.talentId === talentId),
    );
  }
  async removeForOwner(ownerId: string): Promise<void> {
    this.documents = this.documents.filter((d) => d.ownerId !== ownerId);
  }
}

export class InMemoryAttachmentStore implements AttachmentStore {
  blobs: AttachmentBlob[] = [];
  async add(attachment: Attachment, bytes: Buffer): Promise<void> {
    this.blobs.push({ attachment, bytes });
  }
  async list(ownerId: string, talentId: string): Promise<Attachment[]> {
    return this.blobs
      .filter((b) => b.attachment.ownerId === ownerId && b.attachment.talentId === talentId)
      .map((b) => b.attachment);
  }
  async get(ownerId: string, id: string): Promise<AttachmentBlob | null> {
    return (
      this.blobs.find((b) => b.attachment.ownerId === ownerId && b.attachment.id === id) ?? null
    );
  }
  async remove(ownerId: string, id: string): Promise<boolean> {
    const before = this.blobs.length;
    this.blobs = this.blobs.filter(
      (b) => !(b.attachment.ownerId === ownerId && b.attachment.id === id),
    );
    return this.blobs.length < before;
  }
  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    this.blobs = this.blobs.filter(
      (b) => !(b.attachment.ownerId === ownerId && b.attachment.talentId === talentId),
    );
  }
  async removeForOwner(ownerId: string): Promise<void> {
    this.blobs = this.blobs.filter((b) => b.attachment.ownerId !== ownerId);
  }
}

export class InMemoryUserRepository implements UserRepository {
  users: User[] = [];
  async list(): Promise<User[]> {
    return this.users.map((u) => ({ ...u }));
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async add(user: User): Promise<void> {
    this.users.push(user);
  }
  async updateRoles(id: string, roles: Role[]): Promise<void> {
    this.users = this.users.map((u) => (u.id === id ? { ...u, roles } : u));
  }
  async markVerified(id: string, at: string): Promise<void> {
    this.users = this.users.map((u) => (u.id === id ? { ...u, verifiedAt: at } : u));
  }
  async setLlmProvider(id: string, provider: LlmProviderId): Promise<void> {
    this.users = this.users.map((u) => (u.id === id ? { ...u, llmProvider: provider } : u));
  }
  async remove(id: string): Promise<boolean> {
    const before = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    return this.users.length < before;
  }
}

/** In-memory tenant invitations (deterministic tests). */
export class InMemoryInviteRepository implements InviteRepository {
  invites: TenantInvite[] = [];
  async create(invite: TenantInvite): Promise<void> {
    this.invites.push({ ...invite });
  }
  async consume(token: string): Promise<TenantInvite | null> {
    const record = this.invites.find((i) => i.token === token);
    if (!record) return null;
    this.invites = this.invites.filter((i) => i.token !== token);
    return record;
  }
  async listByTenant(tenantId: string): Promise<TenantInvite[]> {
    return this.invites
      .filter((i) => i.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((i) => ({ ...i }));
  }
}

/** In-memory tenant records (deterministic tests). */
export class InMemoryTenantRepository implements TenantRepository {
  tenants: Tenant[] = [];
  async create(tenant: Tenant): Promise<void> {
    this.tenants.push({ ...tenant });
  }
  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.id === id) ?? null;
  }
  async list(): Promise<Tenant[]> {
    return this.tenants
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((t) => ({ ...t }));
  }
  async setStatus(id: string, status: TenantStatus): Promise<boolean> {
    let changed = false;
    this.tenants = this.tenants.map((t) => {
      if (t.id === id && t.status !== status) {
        changed = true;
        return { ...t, status };
      }
      return t;
    });
    return changed;
  }
}

/** In-memory one-time email-verification tokens (deterministic tests). */
export class InMemoryEmailVerificationTokenStore implements EmailVerificationTokenStore {
  tokens: { token: string; userId: string }[] = [];
  private seq = 0;
  async create(userId: string): Promise<string> {
    const token = `verify-token-${(this.seq += 1)}`;
    this.tokens.push({ token, userId });
    return token;
  }
  async consume(token: string): Promise<string | null> {
    const record = this.tokens.find((t) => t.token === token);
    if (!record) return null;
    this.tokens = this.tokens.filter((t) => t.token !== token);
    return record.userId;
  }
  async destroyForUser(userId: string): Promise<void> {
    this.tokens = this.tokens.filter((t) => t.userId !== userId);
  }
}

/** In-memory one-time reset tokens with a fixed-value mint (deterministic tests). */
export class InMemoryPasswordResetTokenStore implements PasswordResetTokenStore {
  tokens: { token: string; userId: string }[] = [];
  private n = 0;
  /** Tokens that `consume` should treat as expired (returns null but still deletes). */
  expired = new Set<string>();
  async create(userId: string): Promise<string> {
    const token = `reset${++this.n}`;
    this.tokens.push({ token, userId });
    return token;
  }
  async consume(token: string): Promise<string | null> {
    const found = this.tokens.find((t) => t.token === token);
    this.tokens = this.tokens.filter((t) => t.token !== token);
    if (!found || this.expired.has(token)) return null;
    return found.userId;
  }
  async destroyForUser(userId: string): Promise<void> {
    this.tokens = this.tokens.filter((t) => t.userId !== userId);
  }
}

/** A Mailer that records what it was asked to send (and can be made to fail). */
export class RecordingMailer implements Mailer {
  sent: MailMessage[] = [];
  constructor(private readonly failWith?: Error) {}
  async send(message: MailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
  }
}

export class InMemoryRetentionPolicyStore implements RetentionPolicyStore {
  policies = new Map<string, RetentionPolicy>();
  async get(ownerId: string): Promise<RetentionPolicy | null> {
    return this.policies.get(ownerId) ?? null;
  }
  async set(ownerId: string, policy: RetentionPolicy): Promise<void> {
    this.policies.set(ownerId, policy);
  }
}

export class InMemoryStageTransitionRepository implements StageTransitionRepository {
  rows: StageTransition[] = [];
  constructor(private readonly failWith?: Error) {}
  async list(ownerId: string): Promise<StageTransition[]> {
    return this.rows.filter((t) => t.ownerId === ownerId).sort((a, b) => a.at.localeCompare(b.at));
  }
  async add(transition: StageTransition): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.rows.push(transition);
  }
}

/** An inbox whose contents the test scripts; records the `since` bounds asked for. */
export class FakeInboxSource implements InboxSource {
  messages: InboxMessage[] = [];
  calls: string[] = [];
  constructor(private readonly failWith?: Error) {}
  async listSince(since: string): Promise<InboxMessage[]> {
    if (this.failWith) throw this.failWith;
    this.calls.push(since);
    return this.messages.filter((m) => m.receivedAt >= since);
  }
}

export class InMemoryApiKeyStore implements ApiKeyStore {
  keys: { ownerId: string; provider: LlmProviderId; key: string }[] = [];
  async set(ownerId: string, provider: LlmProviderId, key: string): Promise<void> {
    this.keys = this.keys.filter((k) => !(k.ownerId === ownerId && k.provider === provider));
    this.keys.push({ ownerId, provider, key });
  }
  async get(ownerId: string, provider: LlmProviderId): Promise<string | null> {
    return this.keys.find((k) => k.ownerId === ownerId && k.provider === provider)?.key ?? null;
  }
  async remove(ownerId: string, provider: LlmProviderId): Promise<boolean> {
    const before = this.keys.length;
    this.keys = this.keys.filter((k) => !(k.ownerId === ownerId && k.provider === provider));
    return this.keys.length < before;
  }
  async providersFor(ownerId: string): Promise<LlmProviderId[]> {
    return this.keys.filter((k) => k.ownerId === ownerId).map((k) => k.provider);
  }
}

export class InMemoryUsageMeter implements UsageMeter {
  events: UsageEvent[] = [];
  async record(event: UsageEvent): Promise<void> {
    this.events.push(event);
  }
  async list(userId: string): Promise<UsageEvent[]> {
    return this.events.filter((e) => e.userId === userId);
  }
  async removeForUser(userId: string): Promise<void> {
    this.events = this.events.filter((e) => e.userId !== userId);
  }
}

export class InMemoryInterviewObservationRepository implements InterviewObservationRepository {
  rows: InterviewObservation[] = [];
  async add(observation: InterviewObservation): Promise<void> {
    this.rows.push(observation);
  }
  async listForCompany(ownerId: string, companyKey: string): Promise<InterviewObservation[]> {
    return this.rows
      .filter((o) => o.ownerId === ownerId && o.companyKey === companyKey)
      .sort((a, b) => b.at.localeCompare(a.at));
  }
  async list(ownerId: string): Promise<InterviewObservation[]> {
    return this.rows.filter((o) => o.ownerId === ownerId).sort((a, b) => b.at.localeCompare(a.at));
  }
}

export class InMemoryAssistantSettingsStore implements AssistantSettingsStore {
  rows = new Map<string, AssistantSettings>();
  async get(ownerId: string): Promise<AssistantSettings | null> {
    return this.rows.get(ownerId) ?? null;
  }
  async set(ownerId: string, settings: AssistantSettings): Promise<void> {
    this.rows.set(ownerId, settings);
  }
}

export class InMemoryAssistantSuggestionRepository implements AssistantSuggestionRepository {
  rows: AssistantSuggestion[] = [];
  async list(ownerId: string): Promise<AssistantSuggestion[]> {
    return this.rows
      .filter((s) => s.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async findById(ownerId: string, id: string): Promise<AssistantSuggestion | null> {
    return this.rows.find((s) => s.ownerId === ownerId && s.id === id) ?? null;
  }
  async add(suggestion: AssistantSuggestion): Promise<void> {
    this.rows.push(suggestion);
  }
  async update(suggestion: AssistantSuggestion): Promise<void> {
    this.rows = this.rows.map((s) =>
      s.ownerId === suggestion.ownerId && s.id === suggestion.id ? suggestion : s,
    );
  }
}

export class InMemoryArtifactLogRepository implements ArtifactLogRepository {
  rows: ArtifactLog[] = [];
  async list(ownerId: string): Promise<ArtifactLog[]> {
    return this.rows
      .filter((l) => l.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async listForTalent(ownerId: string, talentId: string): Promise<ArtifactLog[]> {
    return (await this.list(ownerId)).filter((l) => l.talentId === talentId);
  }
  async findById(ownerId: string, id: string): Promise<ArtifactLog | null> {
    return this.rows.find((l) => l.ownerId === ownerId && l.id === id) ?? null;
  }
  async add(log: ArtifactLog): Promise<void> {
    this.rows.push(log);
  }
  async update(log: ArtifactLog): Promise<void> {
    this.rows = this.rows.map((l) => (l.ownerId === log.ownerId && l.id === log.id ? log : l));
  }
}

/**
 * In-memory AuthEngine for tests — mirrors BetterAuthEngine's contract without
 * SQLite. Credentials are keyed by email; opaque tokens map back to the email.
 */
export class FakeAuthEngine implements AuthEngine {
  private readonly creds = new Map<string, { id: string; password: string }>();
  private readonly sessions = new Map<string, string>(); // token → email
  private seq = 0;
  private tok = 0;

  async signUp(email: string, password: string): Promise<AuthEngineSession> {
    if (this.creds.has(email)) throw new Error('email already registered');
    const id = `eng-user-${++this.seq}`;
    this.creds.set(email, { id, password });
    return { user: { id, email }, token: this.open(email) };
  }

  async signIn(email: string, password: string): Promise<AuthEngineSession | null> {
    const cred = this.creds.get(email);
    if (!cred || cred.password !== password) return null;
    return { user: { id: cred.id, email }, token: this.open(email) };
  }

  async resolve(token: string): Promise<AuthEngineUser | null> {
    const email = this.sessions.get(token);
    const cred = email ? this.creds.get(email) : undefined;
    return cred && email ? { id: cred.id, email } : null;
  }

  async signOut(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async setPassword(email: string, newPassword: string): Promise<void> {
    const cred = this.creds.get(email);
    if (cred) cred.password = newPassword;
  }

  async revokeSessions(email: string): Promise<void> {
    for (const [t, e] of this.sessions) if (e === email) this.sessions.delete(t);
  }

  async erase(email: string): Promise<void> {
    this.creds.delete(email);
    await this.revokeSessions(email);
  }

  private open(email: string): string {
    const token = `eng-token-${++this.tok}`;
    this.sessions.set(token, email);
    return token;
  }
}
