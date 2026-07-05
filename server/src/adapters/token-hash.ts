import { createHash } from 'node:crypto';

/**
 * SHA-256 hash of a bearer token, for storing session / reset / verification
 * tokens **at rest** (ADR-0004 security concept). The raw token is high-entropy
 * random and is what the client holds; the store keeps only its hash, so a leak
 * of `sessions.json` (backup, log, misconfigured volume) does not hand out live
 * sessions. Lookup hashes the presented token and compares — no plaintext token
 * ever touches disk. A plain hash (no salt) is correct here: the input is already
 * 256 bits of randomness, so there is nothing to brute-force.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
