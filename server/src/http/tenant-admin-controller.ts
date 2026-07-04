import type { Request, Response } from 'express';
import { ForbiddenError } from '../domain/errors.js';
import { setRolesSchema } from '../domain/user.js';
import { setTenantStatusSchema } from '../domain/tenant.js';
import type { TenantService } from '../services/tenant-service.js';
import type { MembersService } from '../services/members-service.js';
import { currentIsSuperAdmin } from './current-user.js';

/**
 * The super-admin console (ADR-0037/0038), mounted under `/admin`. Every route
 * is gated on the instance-level super-admin capability — a tenant admin has no
 * access. Reads and manages tenants across the whole instance: list tenants,
 * list/re-role any tenant's members, and suspend/reactivate a tenant.
 */
export class TenantAdminController {
  private readonly service: TenantService;
  private readonly members: MembersService;

  constructor(deps: { tenantService: TenantService; membersService: MembersService }) {
    this.service = deps.tenantService;
    this.members = deps.membersService;
  }

  private requireSuperAdmin(req: Request): void {
    if (!currentIsSuperAdmin(req)) throw new ForbiddenError();
  }

  /** GET /admin/tenants — every tenant with its member count. */
  listTenants = async (req: Request, res: Response): Promise<void> => {
    this.requireSuperAdmin(req);
    res.json(await this.service.list());
  };

  /** GET /admin/tenants/:id/members — the members of any tenant. */
  listMembers = async (req: Request, res: Response): Promise<void> => {
    this.requireSuperAdmin(req);
    res.json(await this.members.list(req.params.id as string));
  };

  /** PATCH /admin/tenants/:id/members/:userId/roles — re-role a member of any tenant. */
  setMemberRoles = async (req: Request, res: Response): Promise<void> => {
    this.requireSuperAdmin(req);
    const { roles } = setRolesSchema.parse(req.body);
    const member = await this.members.setRoles(
      req.params.userId as string,
      roles,
      req.params.id as string,
    );
    res.json({ member });
  };

  /** PATCH /admin/tenants/:id — suspend or reactivate a tenant (ADR-0038). */
  setStatus = async (req: Request, res: Response): Promise<void> => {
    this.requireSuperAdmin(req);
    const { status } = setTenantStatusSchema.parse(req.body);
    const tenant = await this.service.setStatus(req.params.id as string, status);
    res.json({ tenant });
  };
}
