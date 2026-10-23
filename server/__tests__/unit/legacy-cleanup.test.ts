import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { removeLegacyApiKeysFile } from '../../src/adapters/legacy-cleanup.js';

const tmpFile = (): string => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'legacy-cleanup-'));
  return path.join(dir, 'api-keys.json');
};

describe('LegacyCleanup', () => {
  it('LegacyCleanup_ApiKeysFilePresent_DeletesItAndReturnsTrue', async () => {
    const file = tmpFile();
    await fs.writeFile(file, '[{"ownerId":"u1","provider":"claude","value":"x"}]');
    await expect(removeLegacyApiKeysFile(file)).resolves.toBe(true);
    await expect(fs.access(file)).rejects.toBeTruthy();
  });

  it('LegacyCleanup_FileMissing_ReturnsFalseAndDoesNotThrow', async () => {
    await expect(removeLegacyApiKeysFile(tmpFile())).resolves.toBe(false);
  });

  it('LegacyCleanup_RunTwice_IsIdempotent', async () => {
    const file = tmpFile();
    await fs.writeFile(file, '[]');
    await expect(removeLegacyApiKeysFile(file)).resolves.toBe(true);
    await expect(removeLegacyApiKeysFile(file)).resolves.toBe(false);
  });
});
