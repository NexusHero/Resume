import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { FEATURE_MODULES } from '../../src/nest/app.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { AiConfiguredGuard, REQUIRES_AI } from '../../src/nest/ai-configured.guard.js';
import { VermittlungGuard, REQUIRES_VERMITTLUNG } from '../../src/nest/vermittlung.guard.js';
import { AiRateLimitGuard } from '../../src/nest/ai-rate-limit.guard.js';
import { PlanGuard } from '../../src/nest/plan.guard.js';
import {
  AI_ROUTES,
  METHOD_RATE_LIMIT_EXCEPTIONS,
  TEXT_IMPORT_ROUTES,
  VERMITTLER_ROUTES,
  type HttpMethod,
  type RouteSpec,
} from '../support/route-inventory.js';

interface ActualRoute {
  method: HttpMethod;
  path: string;
  controller: string;
  classGuards: unknown[];
  methodGuards: unknown[];
  requiresVermittlung: boolean;
  requiresAi: boolean;
}

const METHOD_NAME: Record<number, HttpMethod> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.DELETE]: 'DELETE',
};

/** Join controller + handler paths into the full API path. */
function joinPath(controllerPath: string, methodPath: string): string {
  const joined = `/${controllerPath}/${methodPath}`.replace(/\/+/g, '/');
  return joined.length > 1 ? joined.replace(/\/$/, '') : joined;
}

/** Every route the feature modules actually register, with its effective guards. */
function collectRoutes(): ActualRoute[] {
  const routes: ActualRoute[] = [];
  for (const featureModule of FEATURE_MODULES) {
    const controllers = (Reflect.getMetadata('controllers', featureModule) ?? []) as Array<
      new (...args: never[]) => unknown
    >;
    for (const controller of controllers) {
      const controllerPaths = (Reflect.getMetadata(PATH_METADATA, controller) ?? '') as
        string | string[];
      const classGuards = (Reflect.getMetadata(GUARDS_METADATA, controller) ?? []) as unknown[];
      const proto = controller.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name === 'constructor') continue;
        const handler = proto[name] as (...args: never[]) => unknown;
        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
        if (requestMethod === undefined) continue;
        const methodPaths = (Reflect.getMetadata(PATH_METADATA, handler) ?? '') as
          string | string[];
        const methodGuards = (Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as unknown[];
        const list = (v: string | string[]) => (Array.isArray(v) ? v : [v]);
        for (const cp of list(controllerPaths)) {
          for (const mp of list(methodPaths)) {
            routes.push({
              method: METHOD_NAME[requestMethod],
              path: joinPath(cp, mp),
              controller: controller.name,
              classGuards,
              methodGuards,
              requiresVermittlung:
                Reflect.getMetadata(REQUIRES_VERMITTLUNG, handler) ??
                Reflect.getMetadata(REQUIRES_VERMITTLUNG, controller) ??
                false,
              requiresAi:
                Reflect.getMetadata(REQUIRES_AI, handler) ??
                Reflect.getMetadata(REQUIRES_AI, controller) ??
                false,
            });
          }
        }
      }
    }
  }
  return routes;
}

const ROUTES = collectRoutes();

function findRoute(spec: RouteSpec): ActualRoute | undefined {
  return ROUTES.find((r) => r.method === spec.method && r.path === spec.path);
}

describe('Route inventory drift guard (plan §5.3/§6.1)', () => {
  it('RouteInventory_CountsAre37VermittlerAnd11AiAnd3TextImportRoutes', () => {
    expect(VERMITTLER_ROUTES).toHaveLength(37);
    expect(AI_ROUTES).toHaveLength(11);
    expect(TEXT_IMPORT_ROUTES).toHaveLength(3);
    expect(new Set(VERMITTLER_ROUTES.map((r) => r.id)).size).toBe(37);
    expect(new Set(ROUTES.map((r) => `${r.method} ${r.path}`)).size).toBe(ROUTES.length);
  });

  it('RouteInventory_EveryDeclaredVermittlerRoute_ExistsAndCarriesTheMarker', () => {
    const missing: string[] = [];
    for (const spec of VERMITTLER_ROUTES) {
      const route = findRoute(spec);
      if (!route) missing.push(`${spec.id} ${spec.method} ${spec.path} (missing)`);
      else if (!route.requiresVermittlung) missing.push(`${spec.id} ${spec.path} (no marker)`);
    }
    expect(missing).toEqual([]);
  });

  it('RouteInventory_RouteNotDeclaredAsVermittler_DoesNotCarryTheMarker', () => {
    const declared = new Set(VERMITTLER_ROUTES.map((r) => `${r.method} ${r.path}`));
    const wrong = ROUTES.filter((r) => r.requiresVermittlung)
      .map((r) => `${r.method} ${r.path}`)
      .filter((key) => !declared.has(key));
    expect(wrong).toEqual([]);
  });

  it('RouteInventory_EveryDeclaredAiRoute_ExistsAndHasTheAiMarker', () => {
    const problems: string[] = [];
    for (const spec of AI_ROUTES) {
      const route = findRoute(spec);
      if (!route) problems.push(`${spec.id} ${spec.method} ${spec.path} (missing)`);
      else if (!spec.conditional && !route.requiresAi) {
        problems.push(`${spec.id} ${spec.path} (no AI marker)`);
      } else if (spec.conditional && route.requiresAi) {
        // K10/K11 answer 503 from the service (only in autopilot); a route-level
        // AI gate would also block the deterministic suggest mode.
        problems.push(`${spec.id} ${spec.path} (must not carry the AI marker)`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('RouteInventory_EffectiveGuardOrder_AuthFirstVermittlungNextAiBeforeRateLimitAndPlan', () => {
    const problems: string[] = [];
    for (const route of ROUTES) {
      const guards = [...route.classGuards, ...route.methodGuards];
      const label = `${route.method} ${route.path}`;
      // The invariant covers the AI/intermediary surfaces; public routes
      // (login, password reset, settings status) legitimately start elsewhere.
      if (route.requiresVermittlung || route.requiresAi) {
        if (guards[0] !== AuthGuard) problems.push(`${label}: AuthGuard is not first`);
      }
      if (route.requiresVermittlung && guards[1] !== VermittlungGuard) {
        problems.push(`${label}: VermittlungGuard is not directly after AuthGuard`);
      }
      if (route.requiresAi) {
        const ai = guards.indexOf(AiConfiguredGuard);
        const rate = guards.indexOf(AiRateLimitGuard);
        const plan = guards.indexOf(PlanGuard);
        if (ai === -1) problems.push(`${label}: AiConfiguredGuard missing`);
        if (rate !== -1 && ai > rate) problems.push(`${label}: AiConfiguredGuard after rate limit`);
        if (plan !== -1 && ai > plan) problems.push(`${label}: AiConfiguredGuard after plan gate`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('RouteInventory_DossierAndAggRewrite_AreDocumentedExceptionsWithMethodRateLimit', () => {
    for (const id of METHOD_RATE_LIMIT_EXCEPTIONS) {
      const spec = VERMITTLER_ROUTES.find((r) => r.id === id)!;
      const route = findRoute(spec)!;
      expect(route.classGuards).not.toContain(AiRateLimitGuard);
      expect(route.methodGuards).toContain(AiRateLimitGuard);
      // Class guards run first: Auth, Vermittlung, Plan; then the method rate limit.
      expect(route.classGuards.slice(0, 2)).toEqual([AuthGuard, VermittlungGuard]);
      expect([...route.classGuards, ...route.methodGuards]).toEqual([
        AuthGuard,
        VermittlungGuard,
        PlanGuard,
        AiRateLimitGuard,
      ]);
    }
  });
});
