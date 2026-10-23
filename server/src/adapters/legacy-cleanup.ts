import { promises as fs } from 'node:fs';

/**
 * One-time, idempotent file-store cleanup run on boot: remove the legacy
 * per-user API-key file. ADR-0057 deleted the per-user key store, and stored
 * ciphertext must not linger on disk (AK-0.7). Returns whether a file was
 * removed so the boot log can say so; a missing file is not an error.
 */
export async function removeLegacyApiKeysFile(file: string): Promise<boolean> {
  try {
    await fs.access(file);
  } catch {
    return false;
  }
  await fs.rm(file, { force: true });
  return true;
}
