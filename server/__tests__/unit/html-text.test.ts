import { stripHtml, truncate, snippetFrom } from '../../src/adapters/html-text.js';

describe('stripHtml', () => {
  it('StripHtml_TagsAndEntities_AreRemoved', () => {
    expect(stripHtml('<p>Build <b>fast</b>&nbsp;systems</p>')).toBe('Build fast systems');
  });
  it('StripHtml_CollapsesWhitespace', () => {
    expect(stripHtml('a   \n  b')).toBe('a b');
  });
});

describe('truncate', () => {
  it('Truncate_ShortString_Unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
  it('Truncate_LongString_CutOnWordBoundaryWithEllipsis', () => {
    expect(truncate('the quick brown fox jumps', 12)).toBe('the quick…');
  });
  it('Truncate_NoSpace_HardCut', () => {
    expect(truncate('abcdefghij', 4)).toBe('abcd…');
  });
});

describe('snippetFrom', () => {
  it('SnippetFrom_Nullish_ReturnsEmpty', () => {
    expect(snippetFrom(undefined)).toBe('');
    expect(snippetFrom(null)).toBe('');
  });
  it('SnippetFrom_StripsThenTruncates', () => {
    expect(snippetFrom('<p>one two three four</p>', 7)).toBe('one…');
  });
});
