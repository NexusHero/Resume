import {
  createApplicationSchema,
  updateApplicationSchema,
  buildApplicationSchema,
  applicationStatusSchema,
  composeAddress,
} from '../../src/domain/application';

describe('createApplicationSchema', () => {
  it('CreateApplication_MinimalInput_AppliesDefaults', () => {
    const parsed = createApplicationSchema.parse({ company: 'Aurora' });
    expect(parsed).toMatchObject({
      company: 'Aurora',
      position: '',
      reference: '',
      status: 'sent',
    });
  });

  it('CreateApplication_MissingCompany_Throws', () => {
    expect(() => createApplicationSchema.parse({})).toThrow();
  });

  it('CreateApplication_NonBase64Pdf_Throws', () => {
    expect(() =>
      createApplicationSchema.parse({ company: 'A', pdfBase64: 'not base64 !!!' }),
    ).toThrow();
  });
});

describe('updateApplicationSchema', () => {
  it('UpdateApplication_PartialSubset_IsAccepted', () => {
    expect(updateApplicationSchema.parse({ status: 'interview' })).toEqual({ status: 'interview' });
  });

  it('UpdateApplication_EmptyCompany_Throws', () => {
    expect(() => updateApplicationSchema.parse({ company: '' })).toThrow();
  });
});

describe('buildApplicationSchema', () => {
  it('BuildApplication_MinimalInput_DefaultsLanguageAndAttachments', () => {
    const parsed = buildApplicationSchema.parse({ company: 'Aurora' });
    expect(parsed.language).toBe('de');
    expect(parsed.attachments).toEqual([]);
  });
});

describe('applicationStatusSchema', () => {
  it('Status_InvalidValue_Throws', () => {
    expect(() => applicationStatusSchema.parse('unknown')).toThrow();
  });
});

describe('composeAddress', () => {
  it('ComposeAddress_ExplicitAddress_TakesPrecedence', () => {
    expect(composeAddress({ address: 'Main St 1', contactName: 'X' })).toBe('Main St 1');
  });

  it('ComposeAddress_NoAddress_JoinsNonEmptyParts', () => {
    expect(
      composeAddress({ contactName: 'Jane Doe', street: '', postalCodeCity: '10115 Berlin' }),
    ).toBe('Jane Doe, 10115 Berlin');
  });

  it('ComposeAddress_NothingProvided_ReturnsEmptyString', () => {
    expect(composeAddress({})).toBe('');
  });
});
