import { hashToken } from '../../src/adapters/token-hash.js';

/** Locks the at-rest token-hashing helper (ADR-0004): stable SHA-256 hex, and
 *  never the identity function (the raw token must not be what we store). */
describe('hashToken', () => {
  it('HashToken_Deterministic64HexAndNotIdentity', () => {
    const token = 'a'.repeat(64);
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token); // storing the hash, not the raw token
    expect(hashToken(token)).toBe(hash); // deterministic → lookup by hash works
  });

  it('HashToken_DistinctInputs_DistinctHashes', () => {
    expect(hashToken('token-one')).not.toBe(hashToken('token-two'));
  });
});
