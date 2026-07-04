import type { Request } from 'express';
import {
  currentUserId,
  optionalUserId,
  currentRoles,
  currentPrincipal,
  currentScope,
  TEAM_SCOPE,
} from '../../src/http/current-user.js';
import { DEFAULT_TENANT } from '../../src/domain/user.js';
import { UnauthorizedError } from '../../src/domain/errors.js';

const req = (over: Record<string, unknown> = {}): Request => over as unknown as Request;

describe('current-user helpers', () => {
  it('CurrentUserId_NoUser_Throws401', () => {
    expect(() => currentUserId(req())).toThrow(UnauthorizedError);
  });

  it('CurrentUserId_WithUser_ReturnsId', () => {
    expect(currentUserId(req({ userId: 'u1' }))).toBe('u1');
  });

  it('OptionalUserId_ReflectsPresence', () => {
    expect(optionalUserId(req())).toBeUndefined();
    expect(optionalUserId(req({ userId: 'u1' }))).toBe('u1');
  });

  it('CurrentRoles_DefaultsToEmpty', () => {
    expect(currentRoles(req())).toEqual([]);
    expect(currentRoles(req({ roles: ['admin'] }))).toEqual(['admin']);
  });

  it('CurrentPrincipal_CombinesIdAndRoles', () => {
    expect(currentPrincipal(req({ userId: 'u1', roles: ['recruiter'] }))).toEqual({
      id: 'u1',
      roles: ['recruiter'],
    });
  });

  it('CurrentScope_NoTenant_FallsBackToDefault', () => {
    expect(currentScope(req())).toBe(DEFAULT_TENANT);
    expect(TEAM_SCOPE).toBe(DEFAULT_TENANT);
  });

  it('CurrentScope_WithTenant_ReturnsTenant', () => {
    expect(currentScope(req({ tenantId: 'acme' }))).toBe('acme');
  });
});
