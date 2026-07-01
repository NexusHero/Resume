import type { Request } from 'express';
import {
  currentUserId,
  optionalUserId,
  currentRoles,
  currentPrincipal,
} from '../../src/http/current-user';
import { UnauthorizedError } from '../../src/domain/errors';

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
});
