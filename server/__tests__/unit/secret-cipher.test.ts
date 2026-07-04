import { SecretCipher } from '../../src/adapters/secret-cipher.js';

const cipher = (secret = 'unit-secret') =>
  new SecretCipher({ config: { security: { encryptionSecret: secret } } });

describe('SecretCipher', () => {
  it('EncryptThenDecrypt_RoundTrips', () => {
    const c = cipher();
    const enc = c.encrypt('sk-ant-secret-value');
    expect(enc.startsWith('v1:')).toBe(true);
    expect(enc).not.toContain('sk-ant-secret-value');
    expect(c.decrypt(enc)).toBe('sk-ant-secret-value');
  });

  it('Encrypt_IsNonDeterministic', () => {
    const c = cipher();
    expect(c.encrypt('x')).not.toBe(c.encrypt('x')); // random IV per call
  });

  it('Decrypt_WrongSecret_ReturnsNull', () => {
    const enc = cipher('secret-a').encrypt('value');
    expect(cipher('secret-b').decrypt(enc)).toBeNull();
  });

  it('Decrypt_Tampered_ReturnsNull', () => {
    const c = cipher();
    const enc = c.encrypt('value');
    const tampered = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A');
    expect(c.decrypt(tampered)).toBeNull();
  });

  it('Decrypt_UnknownFormat_ReturnsNull', () => {
    expect(cipher().decrypt('not-encrypted')).toBeNull();
  });
});
