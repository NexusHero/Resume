import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { AiNotConfiguredError } from '../../src/domain/errors.js';
import { AiConfiguredGuard, REQUIRES_AI, RequiresAi } from '../../src/nest/ai-configured.guard.js';
import { fakeLlmService } from '../support/fakes.js';

class MetaController {
  @RequiresAi()
  gated() {}

  open() {}
}

const ctxFor = (handler: () => void): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => MetaController,
    switchToHttp: () => ({ getRequest: () => ({}) }),
  }) as unknown as ExecutionContext;

const guardFor = (available: boolean, id: 'claude' | 'gemini' = 'claude') => {
  const { service } = fakeLlmService({ available, id });
  return new AiConfiguredGuard(new Reflector(), service);
};

describe('AiConfiguredGuard', () => {
  it('AiConfiguredGuard_NoProviderAvailable_ThrowsAiNotConfigured', () => {
    const guard = guardFor(false);
    expect(() => guard.canActivate(ctxFor(MetaController.prototype.gated))).toThrow(
      AiNotConfiguredError,
    );
  });

  it('AiConfiguredGuard_OnlyAnthropicKey_AllowsRequest', () => {
    expect(guardFor(true, 'claude').canActivate(ctxFor(MetaController.prototype.gated))).toBe(true);
  });

  it('AiConfiguredGuard_OnlyGeminiKey_AllowsRequest', () => {
    expect(guardFor(true, 'gemini').canActivate(ctxFor(MetaController.prototype.gated))).toBe(true);
  });

  it('AiConfiguredGuard_RouteWithoutMetadata_AllowsRequestWithoutProvider', () => {
    expect(guardFor(false).canActivate(ctxFor(MetaController.prototype.open))).toBe(true);
    expect(Reflect.getMetadata(REQUIRES_AI, MetaController.prototype.open)).toBeUndefined();
  });
});
