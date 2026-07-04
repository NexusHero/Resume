import type { Request, Response } from 'express';
import { ForbiddenError } from '../domain/errors';
import type { TenantService } from '../services/tenant-service';
import { currentIsSuperAdmin } from './current-user';

/**
 * The super-admin console (ADR-0037), mounted under `/admin`. Every route is
 * gated on the instance-level super-admin capability — a tenant admin has no
 * access. Read-only in this slice (list tenants); management follows.
 */
export class TenantAdminController {
  private readonly service: TenantService;

  constructor(deps: { tenantService: TenantService }) {
    this.service = deps.tenantService;
  }

  private requireSuperAdmin(req: Request): void {
    if (!currentIsSuperAdmin(req)) throw new ForbiddenError();
  }

  /** GET /admin/tenants — every tenant with its member count. */
  listTenants = async (req: Request, res: Response): Promise<void> => {
    this.requireSuperAdmin(req);
    res.json(await this.service.list());
  };
}
