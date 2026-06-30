import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * Authenticated symmetric encryption (AES-256-GCM) for secrets at rest — e.g.
 * per-user LLM API keys. The 32-byte key is derived from the configured app
 * secret via scrypt. Ciphertext is stored as `v1:base64(iv|tag|ciphertext)`, so
 * a value can be rotated/inspected without leaking the plaintext. No new deps.
 */
export class SecretCipher {
  private readonly key: Buffer;

  constructor(deps: { config: { security: { encryptionSecret: string } } }) {
    // Fixed salt: the secret already provides the entropy; we just need a
    // deterministic 32-byte key from it so values stay decryptable across boots.
    this.key = scryptSync(deps.config.security.encryptionSecret, 'myjob.secret.v1', 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${Buffer.concat([iv, tag, enc]).toString('base64')}`;
  }

  /** Decrypt a value produced by {@link encrypt}; returns null on any tampering/format error. */
  decrypt(value: string): string | null {
    try {
      if (!value.startsWith('v1:')) return null;
      const raw = Buffer.from(value.slice(3), 'base64');
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const enc = raw.subarray(28);
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    } catch {
      return null;
    }
  }
}
