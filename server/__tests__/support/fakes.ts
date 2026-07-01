import type { Application, AuditEvent } from '../../src/domain/application';
import type { ApplicationRepository } from '../../src/ports/application-repository';
import type { AuditLog } from '../../src/ports/audit-log';
import type { PdfArchive } from '../../src/ports/pdf-archive';
import type { CoverLetterOptions, PdfRenderer } from '../../src/ports/pdf-renderer';
import type { PdfMerger } from '../../src/ports/pdf-merger';
import type { PdfTextExtractor } from '../../src/ports/pdf-text-extractor';
import type { Versioner } from '../../src/ports/versioner';
import type { Clock } from '../../src/ports/clock';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';
import type { SkillExtractor } from '../../src/ports/skill-extractor';
import type { SavedSearch } from '../../src/domain/saved-search';
import type { SavedSearchRepository } from '../../src/ports/saved-search-repository';
import type { Mandate } from '../../src/domain/mandate';
import type { MandateRepository } from '../../src/ports/mandate-repository';
import type { Talent } from '../../src/domain/talent';
import type { TalentRepository } from '../../src/ports/talent-repository';
import type { Placement } from '../../src/domain/placement';
import type { PlacementRepository } from '../../src/ports/placement-repository';
import type { Candidacy } from '../../src/domain/candidacy';
import type { CandidacyRepository } from '../../src/ports/candidacy-repository';
import type { TalentDocuments } from '../../src/domain/talent-documents';
import type { DocumentRepository } from '../../src/ports/document-repository';
import type { Attachment } from '../../src/domain/attachment';
import type { AttachmentBlob, AttachmentStore } from '../../src/ports/attachment-store';
import type { User, Role } from '../../src/domain/user';
import type { UserRepository } from '../../src/ports/user-repository';
import type { PasswordHasher } from '../../src/ports/password-hasher';
import type { PasswordResetTokenStore } from '../../src/ports/password-reset-token-store';
import type { Mailer, MailMessage } from '../../src/ports/mailer';
import type { ApiKeyStore } from '../../src/ports/api-key-store';
import type { LlmProviderId } from '../../src/ports/llm-provider';

export class InMemoryApplicationRepository implements ApplicationRepository {
  apps: Application[] = [];
  async list(): Promise<Application[]> {
    return this.apps.map((a) => ({ ...a }));
  }
  async findById(id: string): Promise<Application | null> {
    return this.apps.find((a) => a.id === id) ?? null;
  }
  async add(application: Application): Promise<void> {
    this.apps.push(application);
  }
  async update(application: Application): Promise<void> {
    const i = this.apps.findIndex((a) => a.id === application.id);
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
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    this.users = this.users.map((u) => (u.id === id ? { ...u, passwordHash } : u));
  }
  async updateRoles(id: string, roles: Role[]): Promise<void> {
    this.users = this.users.map((u) => (u.id === id ? { ...u, roles } : u));
  }
  async remove(id: string): Promise<boolean> {
    const before = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    return this.users.length < before;
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

/** A deterministic, fast hasher for tests — NOT for production use. */
export const fakePasswordHasher: PasswordHasher = {
  async hash(plaintext: string): Promise<string> {
    return `hashed:${plaintext}`;
  },
  async verify(plaintext: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plaintext}`;
  },
};
