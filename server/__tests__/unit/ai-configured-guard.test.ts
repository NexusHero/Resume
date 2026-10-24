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

const guardFor = (available: boolean, id: 'claude' | 'gemini' = 'claude', allowDevFake = false) => {
  const { service } = fakeLlmService({ available, id });
  return new AiConfiguredGuard(new Reflector(), service, allowDevFake);
};

describe('AiConfiguredGuard', () => {
  const envBackup = { AGENT_FAKE: process.env.AGENT_FAKE, NODE_ENV: process.env.NODE_ENV };
  const setDevFake = () => {
    process.env.AGENT_FAKE = '1';
    process.env.NODE_ENV = 'development';
  };
  const resetEnv = () => {
    process.env.AGENT_FAKE = envBackup.AGENT_FAKE;
    process.env.NODE_ENV = envBackup.NODE_ENV;
  };
  afterEach(resetEnv);

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

  it('AiConfiguredGuard_AgentRoute_DevFakeWithoutKey_Passes', () => {
    setDevFake();
    const guard = guardFor(false, 'claude', true); // agent module opts into the dev fake
    expect(guard.canActivate(ctxFor(MetaController.prototype.gated))).toBe(true);
  });

  it('AiConfiguredGuard_OtherRoutes_DevFake_Still503', () => {
    setDevFake();
    const guard = guardFor(false); // other routes: allowDevFake defaults to false
    expect(() => guard.canActivate(ctxFor(MetaController.prototype.gated))).toThrow(
      AiNotConfiguredError,
    );
  });

  it('AiConfiguredGuard_AgentRoute_DevFakeInProduction_Still503', () => {
    process.env.AGENT_FAKE = '1';
    process.env.NODE_ENV = 'production'; // agentFakeEnabled is false in production
    const guard = guardFor(false, 'claude', true);
    expect(() => guard.canActivate(ctxFor(MetaController.prototype.gated))).toThrow(
      AiNotConfiguredError,
    );
  });
});
