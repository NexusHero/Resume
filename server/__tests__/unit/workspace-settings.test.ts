import {
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

  it('WithDefaults_StoredPartial_MergesOverOffDefault', () => {
    expect(withDefaults(null)).toEqual({ vermittlung: false });
    expect(withDefaults({ vermittlung: true })).toEqual({ vermittlung: true });
  });

  it('FeatureNotEnabledDetail_NamesTheWorkspaceSwitch', () => {
    expect(FEATURE_NOT_ENABLED_DETAIL).toContain('not enabled for this workspace');
  });
});
