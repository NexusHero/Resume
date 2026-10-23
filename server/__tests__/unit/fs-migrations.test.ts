import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, type AppConfig } from '../../src/config.js';
import { runFsMigrations } from '../../src/adapters/fs-migrations.js';

function tmpConfig(): AppConfig {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'fs-migrations-'));
  return { ...loadConfig({}), rootDir, storeDir: path.join(rootDir, 'bewerbungen') };
}

describe('FsMigrations', () => {
  it('FsMigrations_Run_RemovesLegacyApiKeysFile', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    const legacy = path.join(config.storeDir, 'api-keys.json');
    await fs.writeFile(legacy, '{"owner1":{"claude":"ciphertext"}}');

    await runFsMigrations(config);

    await expect(fs.access(legacy)).rejects.toBeTruthy();
  });

  it('FsMigrations_Run_NoFile_IsIdempotent', async () => {
    const config = tmpConfig();
    // No file exists; both calls must resolve without throwing.
    await expect(runFsMigrations(config)).resolves.toBeUndefined();
    await expect(runFsMigrations(config)).resolves.toBeUndefined();
  });
});
