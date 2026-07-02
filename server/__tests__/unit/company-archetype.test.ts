import { companyInterviewProfile } from '../../src/domain/company-archetype';

describe('company-archetype', () => {
  describe('curated overlay (high confidence)', () => {
    it('Google_ClassifiedAsBigTech', () => {
      const p = companyInterviewProfile('Google Germany GmbH', 'Software Engineer');
      expect(p.archetype).toBe('bigtech_us');
      expect(p.source).toBe('curated');
      expect(p.confidence).toBe('high');
      expect(p.style.formats.join(' ')).toMatch(/coding/i);
    });

    it('NVIDIA_ClassifiedAsDeepTechHardware', () => {
      expect(companyInterviewProfile('NVIDIA', 'GPU Engineer').archetype).toBe('deeptech_hw');
    });

    it('SAP_ClassifiedAsEnterpriseSoftware', () => {
      expect(companyInterviewProfile('SAP SE', 'Cloud Developer').archetype).toBe(
        'enterprise_software',
      );
    });

    it('Trumpf_ClassifiedAsIndustrieMittelstand', () => {
      const p = companyInterviewProfile('TRUMPF SE + Co. KG', 'C++ Engineer');
      expect(p.archetype).toBe('industrie_mittelstand');
      expect(p.style.formats.join(' ')).toMatch(/technical interview/);
    });

    it('Mercedes_ClassifiedAsGrosskonzern', () => {
      expect(companyInterviewProfile('Mercedes-Benz AG', 'Engineer').archetype).toBe(
        'grosskonzern',
      );
    });

    it('McKinsey_ClassifiedAsBeratung', () => {
      expect(companyInterviewProfile('McKinsey & Company', 'Consultant').archetype).toBe(
        'beratung',
      );
    });
  });

  describe('industry cues (medium confidence)', () => {
    it('UnknownConsultancy_InferredFromText', () => {
      const p = companyInterviewProfile('Muster GmbH', 'Consultant', 'Case Study Beratung');
      expect(p.archetype).toBe('beratung');
      expect(p.source).toBe('archetype');
      expect(p.confidence).toBe('medium');
    });

    it('UnknownBank_InferredAsFinance', () => {
      expect(
        companyInterviewProfile('Regionalbank AG', 'Analyst', 'Versicherung Finanz').archetype,
      ).toBe('finance');
    });
  });

  describe('fallback (low confidence)', () => {
    it('UnknownCompany_FallsBackToDefault', () => {
      const p = companyInterviewProfile('Irgendeine Firma', 'Sachbearbeiter');
      expect(p.archetype).toBe('default');
      expect(p.confidence).toBe('low');
      expect(p.style.tips.length).toBeGreaterThan(0);
    });
  });
});
