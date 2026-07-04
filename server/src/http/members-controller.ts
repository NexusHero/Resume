import type { Request, Response } from 'express';
import { setRolesSchema } from '../domain/user.js';
import type { MembersService } from '../services/members-service.js';
import { currentScope } from './current-user.js';

/** Team member management under /api/v1/members. Admin-only, gated at the route (requireCan). */
export class MembersController {
  private readonly service: MembersService;

  constructor(deps: { membersService: MembersService }) {
    this.service = deps.membersService;
  }

  /** GET /members — list the acting admin's tenant (ADR-0033). */
  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list(currentScope(req)));
  };

  /** PATCH /members/:id/roles — set a member's roles within the admin's tenant. */
  setRoles = async (req: Request, res: Response): Promise<void> => {
    const { roles } = setRolesSchema.parse(req.body);
    const member = await this.service.setRoles(req.params.id as string, roles, currentScope(req));
    res.json({ member });
  };
}
