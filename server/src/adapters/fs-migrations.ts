import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';

/**
 * One-time, idempotent file-store migrations run on boot. Today it removes the
 * legacy per-user API-key file: the central-key model (ADR-0057) deleted the
 * per-user key store, and the stored ciphertext must not linger on disk
 * (AK-0.7). `rm({ force: true })` is safe to call when the file is absent.
 */
export async function runFsMigrations(config: AppConfig): Promise<void> {
  const legacyApiKeysFile = path.join(config.storeDir, 'api-keys.json');
  await fs.rm(legacyApiKeysFile, { force: true });
}
