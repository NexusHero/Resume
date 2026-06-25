import type { Application, AuditEvent } from '../../src/domain/application';
import type { ApplicationRepository } from '../../src/ports/application-repository';
import type { AuditLog } from '../../src/ports/audit-log';
import type { PdfArchive } from '../../src/ports/pdf-archive';
import type { CoverLetterOptions, PdfRenderer } from '../../src/ports/pdf-renderer';
import type { Versioner } from '../../src/ports/versioner';
import type { Clock } from '../../src/ports/clock';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';

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
  async renderCv(): Promise<Buffer> {
    return Buffer.from('cv');
  }
  async renderCoverLetter(options: CoverLetterOptions): Promise<Buffer> {
    this.lastCoverLetter = options;
    return Buffer.from('letter');
  }
  async merge(parts: Buffer[]): Promise<Buffer> {
    return Buffer.concat(parts);
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
