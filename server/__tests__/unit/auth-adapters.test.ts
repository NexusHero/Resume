import { ScryptPasswordHasher } from '../../src/adapters/scrypt-password-hasher';
import { MemorySessionStore } from '../../src/adapters/memory-session-store';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('HashThenVerify_CorrectPassword_True', async () => {
    const hash = await hasher.hash('correct horse battery');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await hasher.verify('correct horse battery', hash)).toBe(true);
  });

  it('Verify_WrongPassword_False', async () => {
    const hash = await hasher.hash('correct horse battery');
    expect(await hasher.verify('wrong password', hash)).toBe(false);
  });

  it('Verify_MalformedHash_False', async () => {
    expect(await hasher.verify('x', 'not-a-hash')).toBe(false); // wrong shape
    expect(await hasher.verify('x', 'bcrypt$salt$key')).toBe(false); // wrong scheme
    expect(await hasher.verify('x', 'scrypt$abcd$ab')).toBe(false); // wrong key length
  });
});

describe('MemorySessionStore', () => {
  it('CreateThenLookup_ReturnsUserId', async () => {
    const store = new MemorySessionStore();
    const token = await store.create('u1');
    expect(await store.userIdFor(token)).toBe('u1');
  });

  it('Lookup_UnknownToken_ReturnsNull', async () => {
    const store = new MemorySessionStore();
    expect(await store.userIdFor('nope')).toBeNull();
  });

  it('Destroy_RemovesSession', async () => {
    const store = new MemorySessionStore();
    const token = await store.create('u1');
    await store.destroy(token);
    expect(await store.userIdFor(token)).toBeNull();
  });
});
