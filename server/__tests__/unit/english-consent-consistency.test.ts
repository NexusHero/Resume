import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AiConsentRequiredError } from '../../src/domain/errors.js';
import { AI_CONSENT_REQUIRED_DETAIL } from '../../src/domain/workspace-settings.js';
import { emptyLetter } from '../../src/domain/talent-documents.js';

/* Phase 7 (ADR-0064) fixes exactly one canonical English consent string and one
   canonical English letter salutation/closing across three sources. These tests
   are *hygiene* (copy-drift protection), not flow protection: consent/freeze
   detection runs on `type`/`code`, never on the detail string. */
const CANONICAL_CONSENT = 'AI processing has not been approved for this workspace yet.';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, '../../../design/myjob/ui_kits/recruiting');

describe('english-only consistency (AK-7.4 / AK-7.5)', () => {
  it('AiConsentDetail_ServerConstantsAndClientConstant_AreByteIdentical', () => {
    expect(AI_CONSENT_REQUIRED_DETAIL).toBe(CANONICAL_CONSENT);
    expect(new AiConsentRequiredError().message).toBe(CANONICAL_CONSENT);
    // The client constant lives in the shipped UI kit, authored as a JS file;
    // read it as text so the three sources cannot silently drift apart.
    const dataJs = readFileSync(path.join(KIT, 'data.js'), 'utf8');
    expect(dataJs).toContain(`const AI_CONSENT_REQUIRED = '${CANONICAL_CONSENT}';`);
  });

  it('EmptyLetter_ServerDefaultAndClientEditorDefault_AreByteIdentical', () => {
    expect(emptyLetter.anrede).toBe('Dear Sir or Madam,');
    expect(emptyLetter.gruss).toBe('Kind regards');
    // The client pre-initialises the same fields in Editor.jsx; both must match
    // so a new letter starts with the same formula regardless of entry point.
    const editor = readFileSync(path.join(KIT, 'Editor.jsx'), 'utf8');
    expect(editor).toContain("anrede: 'Dear Sir or Madam,'");
    expect(editor).toContain("gruss: 'Kind regards'");
  });
});
