import {
  stripTrailingSlashes,
  trimChar,
  trimEndChar,
  trimStartChar,
} from '../../src/domain/strings.js';

describe('strings', () => {
  it('StripTrailingSlashes_RemovesOnlyTrailingSlashes', () => {
    expect(stripTrailingSlashes('https://x.test///')).toBe('https://x.test');
    expect(stripTrailingSlashes('https://x.test/a/b')).toBe('https://x.test/a/b');
    expect(stripTrailingSlashes('///')).toBe('');
    expect(stripTrailingSlashes('')).toBe('');
  });

  it('TrimChar_StripsBothEnds', () => {
    expect(trimChar('--a-b--', '-')).toBe('a-b');
    expect(trimStartChar('//p/q/', '/')).toBe('p/q/');
    expect(trimEndChar('node.js..', '.')).toBe('node.js');
  });

  it('StripTrailingSlashes_IsLinearOnLongInput', () => {
    const input = `${'/'.repeat(100_000)}x${'/'.repeat(100_000)}`;
    expect(stripTrailingSlashes(input)).toBe(`${'/'.repeat(100_000)}x`);
  });
});
