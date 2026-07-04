import { NoopVersioner } from '../../src/adapters/noop-versioner.js';

describe('NoopVersioner', () => {
  it('Commit_AlwaysReturnsNull', async () => {
    const versioner = new NoopVersioner();
    expect(await versioner.commit()).toBeNull();
  });
});
