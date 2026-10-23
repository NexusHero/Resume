import { stripHtml, truncate, snippetFrom } from '../../src/adapters/html-text.js';

describe('stripHtml', () => {
  it('StripHtml_TagsAndEntities_AreRemoved', () => {
    expect(stripHtml('<p>Build <b>fast</b>&nbsp;systems</p>')).toBe('Build fast systems');
  });
  it('StripHtml_CollapsesWhitespace', () => {
    expect(stripHtml('a   \n  b')).toBe('a b');
  });
  it('StripHtml_ScriptWithAttributes_Removed', () => {
    expect(
      stripHtml('Hello<script type="text/javascript" async src="x.js">alert(1)</script>World'),
    ).toBe('Hello World');
  });
  it('StripHtml_ScriptEndTagWithWhitespaceVariants_Removed', () => {
    // Obfuscated end tags: junk/whitespace between `</script` and `>` must still
    // close the block (CodeQL: `</script\t\nbar>` must not leak the JS body).
    expect(stripHtml('a<script>var x = 1;</script\t\nbar>b')).toBe('a b');
    expect(stripHtml('a<script>var x = 1;</script >b')).toBe('a b');
    expect(stripHtml('a<script>var x = 1;</script>b')).toBe('a b');
    expect(stripHtml('a<script></script>b')).toBe('a b');
  });
  it('StripHtml_StyleBlocks_Removed', () => {
    expect(stripHtml('<style>.x { color: red; }</style>Hello')).toBe('Hello');
    expect(stripHtml('Hello<style type="text/css">body{}</style>')).toBe('Hello');
  });
  it('StripHtml_KeepsRealText', () => {
    expect(stripHtml('<p>Senior C++ Engineer</p> at <b>Acme</b>')).toBe(
      'Senior C++ Engineer at Acme',
    );
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
