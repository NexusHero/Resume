import {
  rowToApplication,
  applicationToRow,
  rowToAuditEvent,
  auditEventToRow,
  rowToSavedSearch,
  savedSearchToRow,
} from '../../src/adapters/sql/mappers';
import type { Application, AuditEvent } from '../../src/domain/application';
import type { SavedSearch } from '../../src/domain/saved-search';

describe('application mappers', () => {
  it('Application_RoundTrips_PreservingNullAndUndefined', () => {
    const app: Application = {
      id: 'a1',
      date: '2026-06-25',
      company: 'Aurora',
      position: 'Engineer',
      address: 'Berlin',
      reference: '',
      status: 'sent',
      pdfPath: null,
      source: 'api',
      createdAt: '2026-06-25T10:00:00.000Z',
    };
    const row = applicationToRow(app);
    // optional fields become explicit null for Postgres
    expect(row.updatedAt).toBeNull();
    expect(row.commit).toBeNull();
    // and come back as undefined (not null) on the domain object
    const back = rowToApplication({ ...row, pdfPath: null, updatedAt: null, commit: null });
    expect(back).toEqual(app);
    expect('updatedAt' in back ? back.updatedAt : undefined).toBeUndefined();
  });

  it('Application_KeepsSetOptionalFields', () => {
    const row = applicationToRow({
      id: 'a2',
      date: '2026-06-25',
      company: 'X',
      position: '',
      address: '',
      reference: '',
      status: 'interview',
      pdfPath: 'bewerbungen/x.pdf',
      source: 'api',
      createdAt: 'now',
      updatedAt: 'later',
      commit: 'abc1234',
    });
    expect(row.updatedAt).toBe('later');
    expect(row.commit).toBe('abc1234');
    expect(row.pdfPath).toBe('bewerbungen/x.pdf');
  });
});

describe('audit mappers', () => {
  it('AuditEvent_RoundTrips_MappingAppIdAndJsonb', () => {
    const event: AuditEvent = {
      ts: 't1',
      action: 'update',
      id: 'a1',
      by: 'api',
      changed: { status: { from: 'sent', to: 'interview' } },
    };
    const row = auditEventToRow(event);
    expect(row.appId).toBe('a1');
    expect(row.data).toBeNull();
    const back = rowToAuditEvent({
      seq: 1,
      ts: row.ts,
      action: row.action,
      appId: row.appId,
      by: row.by ?? null,
      data: null,
      changed: row.changed ?? null,
      commit: row.commit ?? null,
    });
    expect(back).toEqual(event);
  });

  it('AuditEvent_WithDataAndCommit_PreservesValues', () => {
    const event: AuditEvent = {
      ts: 't3',
      action: 'create',
      id: 'a2',
      data: { company: 'Aurora', status: 'sent' },
      commit: 'abc1234',
    };
    const row = auditEventToRow(event);
    expect(row.data).toEqual({ company: 'Aurora', status: 'sent' });
    expect(row.commit).toBe('abc1234');
    const back = rowToAuditEvent({
      seq: 2,
      ts: row.ts,
      action: row.action,
      appId: row.appId,
      by: row.by ?? null,
      data: row.data ?? null,
      changed: row.changed ?? null,
      commit: row.commit ?? null,
    });
    expect(back).toEqual(event);
  });
});

describe('saved-search mappers', () => {
  it('SavedSearch_RoundTrips', () => {
    const search: SavedSearch = {
      id: 's1',
      name: 'Rust',
      query: { q: 'Rust', threshold: 80 },
      createdAt: 'now',
    };
    const row = savedSearchToRow(search);
    expect(rowToSavedSearch(row as Required<typeof row>)).toEqual(search);
  });
});
