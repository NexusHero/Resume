import { ScryptPasswordHasher } from '../../src/adapters/scrypt-password-hasher.js';
import { MemorySessionStore } from '../../src/adapters/memory-session-store.js';

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

  it('DestroyForUser_RemovesAllOfThatUsersSessions', async () => {
    const store = new MemorySessionStore();
    const a1 = await store.create('u1');
    const a2 = await store.create('u1');
    const b1 = await store.create('u2');
    await store.destroyForUser('u1');
    expect(await store.userIdFor(a1)).toBeNull();
    expect(await store.userIdFor(a2)).toBeNull();
    expect(await store.userIdFor(b1)).toBe('u2'); // other user's session survives
  });

  it('Session_PastTtl_RejectedAndPruned', async () => {
    let nowIso = '2026-01-01T00:00:00.000Z';
    const clock = {
      isoNow: () => nowIso,
      now: () => new Date(nowIso),
      today: () => nowIso.slice(0, 10),
    };
    const store = new MemorySessionStore({ clock, ttlMs: 1000 }); // 1s lifetime
    const token = await store.create('u1');
    expect(await store.userIdFor(token)).toBe('u1'); // within TTL
    nowIso = '2026-01-01T00:00:02.000Z'; // +2s > 1s TTL
    expect(await store.userIdFor(token)).toBeNull(); // expired + pruned
  });
});
