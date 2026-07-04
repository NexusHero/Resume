import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { ApiKeyStore } from '../ports/api-key-store.js';
import type { LlmProviderId } from '../ports/llm-provider.js';
import type { SecretCipher } from './secret-cipher.js';

/** One stored key row: the encrypted value, scoped to (ownerId, provider). */
interface KeyRow {
  ownerId: string;
  provider: LlmProviderId;
  value: string; // ciphertext (SecretCipher)
}

/** File-backed, encrypted per-user API-key store (bewerbungen/api-keys.json). */
export class FsApiKeyStore implements ApiKeyStore {
  private readonly file: string;
  private readonly dir: string;
  private readonly cipher: SecretCipher;

  constructor(deps: { config: AppConfig; secretCipher: SecretCipher }) {
    this.file = deps.config.apiKeysFile;
    this.dir = path.dirname(this.file);
    this.cipher = deps.secretCipher;
  }

  private async readAll(): Promise<KeyRow[]> {
    try {
      const data = JSON.parse(await fs.readFile(this.file, 'utf8'));
      return Array.isArray(data) ? (data as KeyRow[]) : [];
    } catch {
      return [];
    }
  }

  private async write(rows: KeyRow[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(rows, null, 2) + '\n');
  }

  async set(ownerId: string, provider: LlmProviderId, key: string): Promise<void> {
    const rows = (await this.readAll()).filter(
      (r) => !(r.ownerId === ownerId && r.provider === provider),
    );
    rows.push({ ownerId, provider, value: this.cipher.encrypt(key) });
    await this.write(rows);
  }

  async get(ownerId: string, provider: LlmProviderId): Promise<string | null> {
    const row = (await this.readAll()).find(
      (r) => r.ownerId === ownerId && r.provider === provider,
    );
    return row ? this.cipher.decrypt(row.value) : null;
  }

  async remove(ownerId: string, provider: LlmProviderId): Promise<boolean> {
    const all = await this.readAll();
    const next = all.filter((r) => !(r.ownerId === ownerId && r.provider === provider));
    if (next.length === all.length) return false;
    await this.write(next);
    return true;
  }

  async providersFor(ownerId: string): Promise<LlmProviderId[]> {
    return (await this.readAll()).filter((r) => r.ownerId === ownerId).map((r) => r.provider);
  }
}
