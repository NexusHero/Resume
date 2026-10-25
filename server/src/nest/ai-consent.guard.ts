import {
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AI_CONSENT_REQUIRED_DETAIL } from '../domain/workspace-settings.js';
import { AiConsentRequiredError } from '../domain/errors.js';
import { currentScope } from '../http/current-user.js';
import type { WorkspaceSettingsService } from '../services/workspace-settings-service.js';
import { WORKSPACE_SETTINGS_SERVICE } from './tokens.js';

export const REQUIRES_AI_CONSENT = 'requires:ai-consent';

/**
 * Marks a generative route as consent-gated (ADR-0063). The marker lives on the
 * method (like `@RequiresAi()`), the guard on the class, so `AiConsentGuard`
 * always runs in the same position in the chain — after `AiConfiguredGuard`
 * (503) and before `AiRateLimitGuard` (429).
 */
export const RequiresAiConsent = () => SetMetadata(REQUIRES_AI_CONSENT, true);

/**
 * Enforces the workspace-level AI consent (ADR-0063): without `aiConsent`, a
 * generative route answers 403 `ai-consent-required` before the handler, so no
 * CV/ad text is sent to the provider. Reads the stamped scope (`currentScope`);
 * no-op without the marker.
 */
@Injectable()
export class AiConsentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(WORKSPACE_SETTINGS_SERVICE) private readonly settings: WorkspaceSettingsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRES_AI_CONSENT, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!(await this.settings.isAiConsentGranted(currentScope(req)))) {
      throw new AiConsentRequiredError(AI_CONSENT_REQUIRED_DETAIL);
    }
    return true;
  }
}
