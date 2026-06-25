import {
  type Application,
  type AuditEvent,
  type CreateApplicationInput,
  type UpdateApplicationInput,
  type BuildApplicationInput,
  composeAddress,
} from '../domain/application';
import { NotFoundError } from '../domain/errors';
import type { ApplicationRepository } from '../ports/application-repository';
import type { AuditLog } from '../ports/audit-log';
import type { PdfArchive } from '../ports/pdf-archive';
import type { PdfRenderer } from '../ports/pdf-renderer';
import type { Versioner } from '../ports/versioner';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';
import type { Logger } from '../ports/logger';

export interface ApplicationServiceDeps {
  applicationRepository: ApplicationRepository;
  auditLog: AuditLog;
  pdfArchive: PdfArchive;
  pdfRenderer: PdfRenderer;
  versioner: Versioner;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
}

const MUTABLE_FIELDS = ['company', 'position', 'address', 'reference', 'status'] as const;
type MutableField = (typeof MUTABLE_FIELDS)[number];

/** Orchestrates application persistence, PDF building, auditing and versioning. */
export class ApplicationService {
  private readonly repo: ApplicationRepository;
  private readonly audit: AuditLog;
  private readonly archive: PdfArchive;
  private readonly renderer: PdfRenderer;
  private readonly versioner: Versioner;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly logger: Logger;

  constructor(deps: ApplicationServiceDeps) {
    this.repo = deps.applicationRepository;
    this.audit = deps.auditLog;
    this.archive = deps.pdfArchive;
    this.renderer = deps.pdfRenderer;
    this.versioner = deps.versioner;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
    this.logger = deps.logger;
  }

  list(): Promise<Application[]> {
    return this.repo.list();
  }

  history(): Promise<AuditEvent[]> {
    return this.audit.list();
  }

  /** Record an application, optionally archiving a finished PDF. */
  async create(input: CreateApplicationInput): Promise<Application> {
    const pdfBytes = input.pdfBase64 ? Buffer.from(input.pdfBase64, 'base64') : null;
    const address = composeAddress(input);
    return this.persist(
      {
        company: input.company,
        position: input.position,
        address,
        reference: input.reference,
        status: input.status,
      },
      pdfBytes,
      input.source ?? 'api',
    );
  }

  /** Render CV + cover letter, merge with attachments, archive and record. */
  async build(
    input: BuildApplicationInput,
  ): Promise<{ application: Application; pdfBase64: string }> {
    const letter = await this.renderer.renderCoverLetter({
      company: input.company,
      contactName: input.contactName,
      street: input.street,
      postalCodeCity: input.postalCodeCity,
      position: input.position,
      reference: input.reference,
      location: input.location,
      date: input.date,
    });
    const cv = await this.renderer.renderCv({ language: input.language });
    const attachments = input.attachments.map((a) => Buffer.from(a.base64, 'base64'));
    const merged = await this.renderer.merge([letter, cv, ...attachments], {
      title: 'Application — Suhay Sevinc',
    });

    const application = await this.persist(
      {
        company: input.company,
        position: input.position,
        address: composeAddress(input),
        reference: input.reference,
        status: input.status,
      },
      merged,
      input.source ?? 'api',
    );
    return { application, pdfBase64: merged.toString('base64') };
  }

  /** Apply a partial update to mutable fields; no-op updates do not version. */
  async update(id: string, patch: UpdateApplicationInput): Promise<Application> {
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundError(`Application ${id} not found`);

    const changed: Record<string, { from: unknown; to: unknown }> = {};
    const next: Application = { ...current };
    for (const field of MUTABLE_FIELDS) {
      const value = patch[field as MutableField];
      if (value !== undefined && value !== current[field]) {
        changed[field] = { from: current[field], to: value };
        (next as unknown as Record<string, unknown>)[field] = value;
      }
    }

    if (Object.keys(changed).length === 0) return current;

    next.updatedAt = this.clock.isoNow();
    await this.repo.update(next);
    const source = patch.source ?? 'api';
    await this.audit.append({ ts: this.clock.isoNow(), action: 'update', id, by: source, changed });

    const hash = await this.versioner.commit(
      `chore(applications): update ${next.company} (${Object.keys(changed).join(', ')})`,
    );
    if (hash)
      await this.audit.append({ ts: this.clock.isoNow(), action: 'commit', id, commit: hash });
    return next;
  }

  private async persist(
    fields: Pick<Application, 'company' | 'position' | 'address' | 'reference' | 'status'>,
    pdfBytes: Buffer | null,
    source: string,
  ): Promise<Application> {
    const id = this.ids.next();
    const date = this.clock.today();

    let pdfPath: string | null = null;
    if (pdfBytes && pdfBytes.length > 0) {
      pdfPath = await this.archive.save(`${date}_${slug(fields.company)}_${id}`, pdfBytes);
    }

    const application: Application = {
      id,
      date,
      company: fields.company,
      position: fields.position,
      address: fields.address,
      reference: fields.reference,
      status: fields.status,
      pdfPath,
      source,
      createdAt: this.clock.isoNow(),
    };

    await this.repo.add(application);
    await this.audit.append({
      ts: this.clock.isoNow(),
      action: 'create',
      id,
      by: source,
      data: {
        company: application.company,
        position: application.position,
        address: application.address,
        status: application.status,
        pdf: application.pdfPath,
      },
    });
    this.logger.info({ id, company: application.company }, 'application recorded');

    const hash = await this.versioner.commit(
      `feat(applications): record ${application.company}${application.position ? ' — ' + application.position : ''}`,
    );
    if (hash) {
      application.commit = hash;
      await this.audit.append({ ts: this.clock.isoNow(), action: 'commit', id, commit: hash });
    }
    return application;
  }
}

/** ASCII-safe slug used for archived PDF filenames. */
export function slug(value: string): string {
  return (
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'application'
  );
}
