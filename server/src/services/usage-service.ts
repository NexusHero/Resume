import {
  summarizeUsage,
  buildAuditTrail,
  auditTrailToCsv,
  type UsageSummary,
  type AuditEntry,
} from '../domain/usage';
import type { UsageMeter } from '../ports/usage-meter';

export interface UsageServiceDeps {
  usageMeter: UsageMeter;
}

/**
 * Reads a user's metered LLM calls back as an aggregate — total requests,
 * tokens and a rough cost, broken down by provider and feature — for the
 * settings usage card. Usage is per user because API keys (and therefore quota)
 * are per user, not shared across the team.
 */
export class UsageService {
  private readonly meter: UsageMeter;

  constructor(deps: UsageServiceDeps) {
    this.meter = deps.usageMeter;
  }

  async summaryFor(userId: string): Promise<UsageSummary> {
    return summarizeUsage(await this.meter.list(userId));
  }

  /** The per-call AI audit trail (KI-Audit-Trail), newest first. */
  async auditFor(userId: string): Promise<AuditEntry[]> {
    return buildAuditTrail(await this.meter.list(userId));
  }

  /** The same trail serialized as an Excel-safe CSV for export. */
  async auditCsvFor(userId: string): Promise<string> {
    return auditTrailToCsv(await this.auditFor(userId));
  }
}
