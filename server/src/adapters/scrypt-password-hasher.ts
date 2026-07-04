import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from '../ports/password-hasher.js';

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

/**
 * Password hashing via Node's built-in scrypt (no native deps). Format:
 * `scrypt$<saltHex>$<keyHex>`. Verification is constant-time.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plaintext: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scryptAsync(plaintext, salt, KEY_LEN)) as Buffer;
    return `scrypt$${salt}$${derived.toString('hex')}`;
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    const [scheme, salt, keyHex] = hash.split('$');
    if (scheme !== 'scrypt' || !salt || !keyHex) return false;
    const expected = Buffer.from(keyHex, 'hex');
    const derived = (await scryptAsync(plaintext, salt, KEY_LEN)) as Buffer;
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  }
}
