import { deriveDisplayNameFromEmail } from '../../src/domain/display-name.js';

describe('deriveDisplayNameFromEmail', () => {
  it('CapitalizesEachDotSeparatedWord', () => {
    expect(deriveDisplayNameFromEmail('suhay.sevinc@example.com')).toBe('Suhay Sevinc');
  });

  it('DropsAPlusAddressSubaddress', () => {
    expect(deriveDisplayNameFromEmail('recruiter+test@example.com')).toBe('Recruiter');
  });

  it('StripsDigitsAndSymbolsPerWord', () => {
    expect(deriveDisplayNameFromEmail('anna-lena_23@example.com')).toBe('Anna Lena');
  });

  it('ReturnsEmptyStringForAnUnparseableLocalPart', () => {
    expect(deriveDisplayNameFromEmail('@example.com')).toBe('');
  });
});
