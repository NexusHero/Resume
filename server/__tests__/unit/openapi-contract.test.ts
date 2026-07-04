import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMandateSchema } from '../../src/domain/mandate';
import { createTalentSchema } from '../../src/domain/talent';
import { createPlacementSchema } from '../../src/domain/placement';

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
const SPEC = readFileSync(join(__dirname, '..', '..', 'openapi.yaml'), 'utf8');

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
