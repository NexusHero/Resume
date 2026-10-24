import { safeFilename, slug } from '../../src/domain/slug.js';

describe('slug', () => {
  it('Slug_LowercasesAndStripsUmlauts', () => {
    expect(slug('Müller Straße')).toBe('mueller-strasse');
    expect(slug('  Hello World!  ')).toBe('hello-world');
    expect(slug('')).toBe('application');
  });
});

describe('safeFilename', () => {
  it('SafeFilename_StripsIllegalCharsAndSlashes', () => {
    expect(safeFilename('Acme/Corp\\Sub:Folder*?x"<y>|z', 'Firma')).toBe('AcmeCorpSubFolderxyz');
  });

  it('SafeFilename_CollapsesWhitespaceToUnderscores', () => {
    expect(safeFilename('Nordwind  Logistik   AG', 'Firma')).toBe('Nordwind_Logistik_AG');
  });

  it('SafeFilename_EmptyAfterStrip_FallsBack', () => {
    expect(safeFilename('', 'Mandant')).toBe('Mandant');
    expect(safeFilename('///', 'Mandant')).toBe('Mandant');
    expect(safeFilename('*?:', 'Firma')).toBe('Firma');
  });

  it('SafeFilename_StripsControlCharacters', () => {
    expect(safeFilename('Acme\u0000\u001fGmbH', 'Firma')).toBe('AcmeGmbH');
  });
});
