import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMandateSchema } from '../../src/domain/mandate.js';
import { createTalentSchema } from '../../src/domain/talent.js';
import { createPlacementSchema } from '../../src/domain/placement.js';
import { updateWorkspaceSettingsSchema } from '../../src/domain/workspace-settings.js';
import {
  adoptJobPostingSchema,
  createJobPostingSchema,
  updateJobPostingSchema,
} from '../../src/domain/job-posting.js';
import {
  changeJobApplicationStatusSchema,
  createJobApplicationSchema,
} from '../../src/domain/job-application.js';
import { VERMITTLER_ROUTES } from '../support/route-inventory.js';

/**
 * Drift guard for the hand-maintained OpenAPI spec (ADR-0012). The zod schemas
 * at the HTTP boundary are the source of truth for request shapes; the spec is
 * written by hand, so a field added to a zod schema can silently miss the spec.
 *
 * This test parses the committed `openapi.yaml` (no YAML dependency — a small
 * indentation-scoped reader for the one thing we need: a schema's property keys)
 * and asserts every field of the mapped zod request schema is documented. It is
 * directional (zod → spec): the compiler already keeps zod and the handlers in
 * sync, and this closes the remaining gap to the published contract.
 */
const SPEC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'openapi.yaml'),
  'utf8',
);

/** Property keys declared under `components/schemas/<name>`. */
function openApiProps(name: string): string[] {
  const lines = SPEC.split('\n');
  const start = lines.findIndex((l) => l === `    ${name}:`);
  if (start === -1) throw new Error(`schema ${name} not found in openapi.yaml`);
  const keys: string[] = [];
  let inProps = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^ {4}\S/.test(line)) break; // reached the next schema (indent 4)
    if (/^ {6}properties:\s*$/.test(line)) {
      inProps = true;
      continue;
    }
    if (inProps) {
      if (/^ {6}\S/.test(line)) break; // left the properties block (back to indent 6)
      const match = /^ {8}(\w+):/.exec(line);
      if (match) keys.push(match[1]);
    }
  }
  return keys;
}

/** The field names of a zod object schema, unwrapping effect/default wrappers. */
interface ZodInternals {
  shape?: Record<string, unknown>;
  _def?: { schema?: unknown; innerType?: unknown; sourceType?: unknown };
}
function zodKeys(schema: unknown): string[] {
  let node = schema as ZodInternals | undefined;
  while (node && !node.shape && node._def) {
    node = (node._def.schema ?? node._def.innerType ?? node._def.sourceType) as
      ZodInternals | undefined;
  }
  return node?.shape ? Object.keys(node.shape) : [];
}

const CASES: Array<[string, unknown]> = [
  ['MandateInput', createMandateSchema],
  ['TalentInput', createTalentSchema],
  ['PlacementInput', createPlacementSchema],
  ['CreateJobPostingInput', createJobPostingSchema],
  ['AdoptJobPostingInput', adoptJobPostingSchema],
  ['UpdateJobPostingInput', updateJobPostingSchema],
  ['CreateJobApplicationInput', createJobApplicationSchema],
  ['ChangeJobApplicationStatusInput', changeJobApplicationStatusSchema],
];

describe('OpenAPI contract stays in sync with the zod boundary schemas', () => {
  it.each(CASES)('%s documents every field of its zod request schema', (name, schema) => {
    const zodFields = zodKeys(schema);
    expect(zodFields.length).toBeGreaterThan(0); // guard: the unwrap actually found the object
    const documented = new Set(openApiProps(name));
    const missing = zodFields.filter((field) => !documented.has(field));
    expect(missing).toEqual([]);
  });
});

describe('Phase 0 OpenAPI contract (ADR-0057)', () => {
  it('OpenApi_ProviderId_HasNoTemplate', () => {
    expect(SPEC).toContain('enum: [claude, gemini]');
    expect(SPEC).not.toMatch(/enum: \[claude, gemini, template\]/);
  });

  it('OpenApi_KeyRoutes_AreRemoved', () => {
    expect(SPEC).not.toContain('/settings/keys');
  });

  it('OpenApi_CoverLetter_RequiresSession', () => {
    const block = SPEC.slice(SPEC.indexOf('  /cover-letter:'), SPEC.indexOf('components:'));
    expect(block).toContain('cookieSession: []');
    expect(block).toContain("'401'");
    expect(block).not.toMatch(/open route with template fallback/);
  });

  it('OpenApi_ResumeSchema_DocumentsRawText', () => {
    expect(openApiProps('TalentDocuments')).toContain('resume');
    expect(SPEC).toContain('rawText:');
  });

  it('OpenApi_UpdateWorkspaceSettingsInput_DocumentsEveryZodField', () => {
    expect(openApiProps('WorkspaceSettings')).toEqual(
      expect.arrayContaining(zodKeys(updateWorkspaceSettingsSchema)),
    );
  });

  it('OpenApi_ParsePdf_Documents422NoTextLayer', () => {
    expect(SPEC).toContain('NoTextLayer');
    expect(SPEC).toContain('about:blank#no-text-layer');
  });

  it('OpenApi_ImportResponses_DocumentModeTruncatedAndAttachmentId', () => {
    expect(SPEC).toContain('truncated:');
    expect(SPEC).toContain('attachmentId:');
    expect(SPEC).toContain('enum: [text, ai]');
  });

  it('OpenApi_EveryAiOperation_Documents503AndReferencesAiNotConfigured', () => {
    expect(SPEC).toContain('AiNotConfigured');
    expect(SPEC).toContain('about:blank#ai-not-configured');
  });
});

describe('Phase 1 OpenAPI contract (ADR-0058, Stellen)', () => {
  it('OpenApi_JobPostingSchema_DocumentsEveryZodField', () => {
    const props = openApiProps('JobPosting');
    expect(props).toEqual(
      expect.arrayContaining([
        'id',
        'ownerId',
        'source',
        'sourceId',
        'url',
        'company',
        'title',
        'location',
        'country',
        'description',
        'requirements',
        'descriptionIncomplete',
        'createdAt',
      ]),
    );
    expect(props).toContain('descriptionIncomplete');
    expect(props).toContain('requirements');
  });

  it('OpenApi_JobPostingRoutes_Exist', () => {
    const paths = [
      '/job-postings',
      '/job-postings/adopt',
      '/job-postings/extract',
      '/job-postings/{id}',
    ];
    for (const path of paths) {
      expect(SPEC).toContain(`  ${path}:`);
    }
    // all seven operations are declared
    for (const op of [
      'listJobPostings',
      'createJobPosting',
      'adoptJobPosting',
      'extractJobPosting',
      'getJobPosting',
      'updateJobPosting',
      'deleteJobPosting',
    ]) {
      expect(SPEC).toContain(`operationId: ${op}`);
    }
  });

  it('OpenApi_Extract_Documents503AiNotConfiguredAnd422NoTextAnd400SsrfBlocked', () => {
    const block = operationBlock('/api/v1/job-postings/extract', 'post');
    expect(block).toContain('AiNotConfigured');
    expect(block).toContain('NoText');
    expect(block).toContain('SsrfBlocked');
    // 400 is both a validation error and an SSRF block; 502 is both a fetch
    // failure and an unusable provider reply (G5 review).
    expect(block).toContain('ValidationProblem');
    expect(block).toContain('UpstreamProvider');
  });
});

describe('Phase 2 OpenAPI contract (ADR-0059, Bewerbungen)', () => {
  it('OpenApi_JobApplicationSchema_DocumentsEveryField', () => {
    const props = openApiProps('JobApplication');
    expect(props).toEqual(
      expect.arrayContaining([
        'id',
        'ownerId',
        'jobPostingId',
        'postingCompany',
        'postingTitle',
        'talentId',
        'talentName',
        'status',
        'statusHistory',
        'documents',
        'createdAt',
        'updatedAt',
      ]),
    );
    expect(SPEC).toContain('enum: [draft, sent, interview, offer, rejected]');
  });

  it('OpenApi_JobApplicationRoutes_Exist', () => {
    for (const path of [
      '/job-applications',
      '/job-applications/{id}',
      '/job-applications/{id}/documents',
      '/job-applications/{id}/letter',
      '/job-applications/{id}/status',
    ]) {
      expect(SPEC).toContain(`  ${path}:`);
    }
    for (const op of [
      'listJobApplications',
      'createJobApplication',
      'getJobApplication',
      'deleteJobApplication',
      'getJobApplicationDocuments',
      'saveJobApplicationDocuments',
      'generateJobApplicationLetter',
      'changeJobApplicationStatus',
    ]) {
      expect(SPEC).toContain(`operationId: ${op}`);
    }
  });

  it('OpenApi_Letter_Documents503AiNotConfiguredAnd502UpstreamProvider', () => {
    const block = operationBlock('/api/v1/job-applications/:id/letter', 'post');
    expect(block).toContain('AiNotConfigured');
    expect(block).toContain('UpstreamProvider');
    expect(block).toContain('NotFound');
    expect(block).toContain('Unauthorized');
  });
});

describe('Phase 3 OpenAPI contract (ADR-0060, Magic Pen)', () => {
  it('OpenApi_PenSuggestionSchema_DocumentsBeforeAfterGrounding', () => {
    const props = openApiProps('PenSuggestion');
    expect(props).toEqual(
      expect.arrayContaining([
        'section',
        'before',
        'after',
        'experienceIndex',
        'station',
        'provider',
        'usage',
        'grounding',
      ]),
    );
  });

  it('OpenApi_PenLetterSlotSchema_Exists', () => {
    expect(openApiProps('PenLetterSuggestion')).toEqual(
      expect.arrayContaining([
        'section',
        'before',
        'after',
        'provider',
        'usage',
        'grounding',
        'checks',
      ]),
    );
    expect(openApiProps('PenAllResult')).toEqual(expect.arrayContaining(['sections']));
    // The aggregate is a oneOf/discriminator union over `section`.
    expect(SPEC).toContain('PenAllEntry');
    expect(SPEC).toContain('propertyName: section');
    expect(SPEC).toContain('PenAllErrorSlot');
  });

  it('OpenApi_PenRoutes_Exist', () => {
    for (const path of [
      '/job-applications/{id}/pen/headline',
      '/job-applications/{id}/pen/summary',
      '/job-applications/{id}/pen/experience',
      '/job-applications/{id}/pen/skills',
      '/job-applications/{id}/pen/all',
    ]) {
      expect(SPEC).toContain(`  ${path}:`);
    }
    for (const op of ['penHeadline', 'penSummary', 'penExperience', 'penSkills', 'penAll']) {
      expect(SPEC).toContain(`operationId: ${op}`);
    }
  });

  it('OpenApi_Pen_Documents503AiNotConfiguredAnd502UpstreamProvider', () => {
    const block = operationBlock('/api/v1/job-applications/:id/pen/headline', 'post');
    expect(block).toContain('AiNotConfigured');
    expect(block).toContain('UpstreamProvider');
    expect(block).toContain('NotFound');
    expect(block).toContain('Unauthorized');
  });
});

/** One operation block (`path` + method) from the hand-written spec. */
function operationBlock(path: string, method: string): string {
  const lines = SPEC.split('\n');
  const rel = path.replace('/api/v1', '').replace(':talentId', '{talentId}').replace(':id', '{id}');
  const start = lines.findIndex((l) => l === `  ${rel}:`);
  if (start === -1) throw new Error(`path ${rel} not found`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^ {2}\/\S+:/.test(lines[i]) || lines[i] === 'components:') {
      end = i;
      break;
    }
  }
  const block = lines.slice(start, end);
  const mStart = block.findIndex((l) => l === `    ${method.toLowerCase()}:`);
  if (mStart === -1) throw new Error(`${method} ${rel} not found`);
  const mEnd = block.findIndex((l, i) => i > mStart && /^ {4}[a-z]+:$/.test(l));
  return (mEnd === -1 ? block.slice(mStart) : block.slice(mStart, mEnd)).join('\n');
}

describe('OpenAPI: every intermediary operation has one documented 404', () => {
  it('OpenApi_EveryVermittlerOperation_HasExactlyOne404ReferencingNotFoundOrNotEnabled', () => {
    const problems: string[] = [];
    for (const route of VERMITTLER_ROUTES) {
      const op = operationBlock(route.path, route.method);
      const refs = op.split('\n').filter((l) => /^ {8}'404':/.test(l));
      if (refs.length !== 1) {
        problems.push(`${route.id}: ${refs.length} 404 keys`);
      } else if (!refs[0].includes('NotFoundOrNotEnabled')) {
        problems.push(`${route.id}: 404 does not reference NotFoundOrNotEnabled`);
      }
    }
    expect(problems).toEqual([]);
  });
});
