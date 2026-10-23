/**
 * The single source of truth for the Phase-0 route tables (plan §5.1/§5.2).
 * The table-driven acceptance tests and the drift guard both read this file, so
 * a route added/removed in code without updating the tables fails a test.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteSpec {
  /** Stable plan id (R01, K01, T01). */
  id: string;
  method: HttpMethod;
  /** Full API path (e.g. `/api/v1/mandates`). */
  path: string;
  /** Controller file under `server/src/nest/`, for documentation. */
  controller: string;
  /**
   * K10/K11 only: the AI gate applies when the request selects autopilot; the
   * 503 then comes from the service, not a guard.
   */
  conditional?: 'autopilot';
}

/** The 37 intermediary routes (plan §5.2): 404 when the workspace switch is off. */
export const VERMITTLER_ROUTES: RouteSpec[] = [
  {
    id: 'R01',
    method: 'GET',
    path: '/api/v1/mandates',
    controller: 'mandates/mandates.controller.ts',
  },
  {
    id: 'R02',
    method: 'POST',
    path: '/api/v1/mandates',
    controller: 'mandates/mandates.controller.ts',
  },
  {
    id: 'R03',
    method: 'PATCH',
    path: '/api/v1/mandates/:id',
    controller: 'mandates/mandates.controller.ts',
  },
  {
    id: 'R04',
    method: 'DELETE',
    path: '/api/v1/mandates/:id',
    controller: 'mandates/mandates.controller.ts',
  },
  {
    id: 'R05',
    method: 'POST',
    path: '/api/v1/mandates/:id/match',
    controller: 'match/match.module.ts',
  },
  {
    id: 'R06',
    method: 'POST',
    path: '/api/v1/mandates/:id/candidates/:talentId/explain',
    controller: 'match-ai/match-ai.module.ts',
  },
  {
    id: 'R07',
    method: 'POST',
    path: '/api/v1/mandates/:id/candidates/:talentId/interview-kit',
    controller: 'match-ai/match-ai.module.ts',
  },
  {
    id: 'R08',
    method: 'POST',
    path: '/api/v1/mandates/:id/candidates/:talentId/prep',
    controller: 'match-ai/match-ai.module.ts',
  },
  {
    id: 'R09',
    method: 'GET',
    path: '/api/v1/mandates/:id/observations',
    controller: 'observations/observations.module.ts',
  },
  {
    id: 'R10',
    method: 'POST',
    path: '/api/v1/mandates/:id/observations',
    controller: 'observations/observations.module.ts',
  },
  {
    id: 'R11',
    method: 'GET',
    path: '/api/v1/mandates/:id/candidacies',
    controller: 'candidacies/candidacies.module.ts',
  },
  {
    id: 'R12',
    method: 'POST',
    path: '/api/v1/mandates/:id/candidacies',
    controller: 'candidacies/candidacies.module.ts',
  },
  {
    id: 'R13',
    method: 'GET',
    path: '/api/v1/talents/:id/candidacies',
    controller: 'candidacies/candidacies.module.ts',
  },
  {
    id: 'R14',
    method: 'PATCH',
    path: '/api/v1/candidacies/:id',
    controller: 'candidacies/candidacies.module.ts',
  },
  {
    id: 'R15',
    method: 'DELETE',
    path: '/api/v1/candidacies/:id',
    controller: 'candidacies/candidacies.module.ts',
  },
  {
    id: 'R16',
    method: 'GET',
    path: '/api/v1/placements',
    controller: 'placements/placements.module.ts',
  },
  {
    id: 'R17',
    method: 'POST',
    path: '/api/v1/placements',
    controller: 'placements/placements.module.ts',
  },
  {
    id: 'R18',
    method: 'PATCH',
    path: '/api/v1/placements/:id',
    controller: 'placements/placements.module.ts',
  },
  {
    id: 'R19',
    method: 'DELETE',
    path: '/api/v1/placements/:id',
    controller: 'placements/placements.module.ts',
  },
  { id: 'R20', method: 'GET', path: '/api/v1/forecast', controller: 'forecast/forecast.module.ts' },
  {
    id: 'R21',
    method: 'GET',
    path: '/api/v1/artifacts',
    controller: 'artifacts/artifacts.module.ts',
  },
  {
    id: 'R22',
    method: 'GET',
    path: '/api/v1/artifacts/stats',
    controller: 'artifacts/artifacts.module.ts',
  },
  {
    id: 'R23',
    method: 'POST',
    path: '/api/v1/artifacts/:id/outcome',
    controller: 'artifacts/artifacts.module.ts',
  },
  {
    id: 'R24',
    method: 'POST',
    path: '/api/v1/talents/:id/outreach/send',
    controller: 'mail/mail.module.ts',
  },
  {
    id: 'R25',
    method: 'POST',
    path: '/api/v1/mail/sync-replies',
    controller: 'mail/mail.module.ts',
  },
  { id: 'R26', method: 'GET', path: '/api/v1/mail/status', controller: 'mail/mail.module.ts' },
  {
    id: 'R27',
    method: 'GET',
    path: '/api/v1/assistant',
    controller: 'assistant/assistant.module.ts',
  },
  {
    id: 'R28',
    method: 'PUT',
    path: '/api/v1/assistant',
    controller: 'assistant/assistant.module.ts',
  },
  {
    id: 'R29',
    method: 'POST',
    path: '/api/v1/assistant/run',
    controller: 'assistant/assistant.module.ts',
  },
  {
    id: 'R30',
    method: 'GET',
    path: '/api/v1/assistant/suggestions',
    controller: 'assistant/assistant.module.ts',
  },
  {
    id: 'R31',
    method: 'POST',
    path: '/api/v1/assistant/suggestions/:id/accept',
    controller: 'assistant/assistant.module.ts',
  },
  {
    id: 'R32',
    method: 'POST',
    path: '/api/v1/assistant/suggestions/:id/dismiss',
    controller: 'assistant/assistant.module.ts',
  },
  {
    id: 'R33',
    method: 'GET',
    path: '/api/v1/assistant/suggestions/:id/dossier.pdf',
    controller: 'assistant/assistant.module.ts',
  },
  {
    id: 'R34',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/pitch',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'R35',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/outreach',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'R36',
    method: 'POST',
    path: '/api/v1/compliance/agg-check',
    controller: 'compliance/compliance.module.ts',
  },
  {
    id: 'R37',
    method: 'POST',
    path: '/api/v1/compliance/agg-rewrite',
    controller: 'compliance/compliance.module.ts',
  },
];

/** The 11 generative AI routes (plan §5.1): 503 without a central key. */
export const AI_ROUTES: RouteSpec[] = [
  {
    id: 'K01',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/ai',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'K02',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/ats',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'K03',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/pitch',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'K04',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/outreach',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'K05',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/translate',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'K06',
    method: 'POST',
    path: '/api/v1/mandates/:id/candidates/:talentId/explain',
    controller: 'match-ai/match-ai.module.ts',
  },
  {
    id: 'K07',
    method: 'POST',
    path: '/api/v1/mandates/:id/candidates/:talentId/interview-kit',
    controller: 'match-ai/match-ai.module.ts',
  },
  {
    id: 'K08',
    method: 'POST',
    path: '/api/v1/mandates/:id/candidates/:talentId/prep',
    controller: 'match-ai/match-ai.module.ts',
  },
  { id: 'K09', method: 'POST', path: '/api/v1/cover-letter', controller: 'llm/llm.module.ts' },
  {
    id: 'K10',
    method: 'POST',
    path: '/api/v1/assistant/run',
    controller: 'assistant/assistant.module.ts',
    conditional: 'autopilot',
  },
  {
    id: 'K11',
    method: 'PUT',
    path: '/api/v1/assistant',
    controller: 'assistant/assistant.module.ts',
    conditional: 'autopilot',
  },
];

/** The 3 CV import routes: the named text mode works without a key. */
export const TEXT_IMPORT_ROUTES: RouteSpec[] = [
  {
    id: 'T01',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/parse',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'T02',
    method: 'POST',
    path: '/api/v1/talents/:id/documents/parse-pdf',
    controller: 'ai/documents-ai.controller.ts',
  },
  {
    id: 'T03',
    method: 'POST',
    path: '/api/v1/talents/import',
    controller: 'talents/talent-import.module.ts',
  },
];

/** Documented method-level rate-limit exceptions (plan §3.5/§5.3). */
export const METHOD_RATE_LIMIT_EXCEPTIONS = new Set(['R33', 'R37']);
