import {
  AI_CONSENT_REQUIRED_DETAIL,
  FEATURE_NOT_ENABLED_DETAIL,
  updateWorkspaceSettingsSchema,
  withDefaults,
} from '../../src/domain/workspace-settings.js';

describe('workspace-settings domain', () => {
  it('UpdateWorkspaceSettingsSchema_EmptyBody_IsRejected', () => {
    expect(updateWorkspaceSettingsSchema.safeParse({}).success).toBe(false);
  });

  it('UpdateWorkspaceSettingsSchema_NonBooleanVermittlung_IsRejected', () => {
    expect(updateWorkspaceSettingsSchema.safeParse({ vermittlung: 'yes' }).success).toBe(false);
  });

  it('UpdateWorkspaceSettingsSchema_UnknownKey_IsRejected', () => {
    expect(updateWorkspaceSettingsSchema.safeParse({ foo: true }).success).toBe(false);
  });

  it('UpdateWorkspaceSettingsSchema_BooleanVermittlung_IsAccepted', () => {
    expect(updateWorkspaceSettingsSchema.parse({ vermittlung: true })).toEqual({
      vermittlung: true,
    });
  });

  it('UpdateWorkspaceSettingsSchema_AcceptsAiConsent', () => {
    expect(updateWorkspaceSettingsSchema.parse({ aiConsent: true })).toEqual({ aiConsent: true });
    expect(updateWorkspaceSettingsSchema.parse({ aiConsent: false })).toEqual({
      aiConsent: false,
    });
  });

  it('UpdateWorkspaceSettingsSchema_RejectsUnknownKeys', () => {
    expect(updateWorkspaceSettingsSchema.safeParse({ aiConsent: true, bogus: 1 }).success).toBe(
      false,
    );
  });

  it('WithDefaults_StoredPartial_MergesOverOffDefault', () => {
    expect(withDefaults(null)).toEqual({ vermittlung: false, aiConsent: false });
    expect(withDefaults({ vermittlung: true })).toEqual({ vermittlung: true, aiConsent: false });
  });

  it('WithDefaults_MissingAiConsent_DefaultsFalse', () => {
    // OQ2: no backfill — legacy records without the field default to false.
    expect(withDefaults({ vermittlung: true }).aiConsent).toBe(false);
    expect(withDefaults(undefined).aiConsent).toBe(false);
  });

  it('FeatureNotEnabledDetail_NamesTheWorkspaceSwitch', () => {
    expect(FEATURE_NOT_ENABLED_DETAIL).toContain('not enabled for this workspace');
  });

  it('AiConsentRequiredDetail_NamesTheWorkspaceConsent', () => {
    expect(AI_CONSENT_REQUIRED_DETAIL).toContain('AI processing');
  });
});
