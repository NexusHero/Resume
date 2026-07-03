import type { Request, Response } from 'express';
import { setRolesSchema } from '../domain/user';
import { ForbiddenError } from '../domain/errors';
import type { MembersService } from '../services/members-service';
import type { Authorizer } from '../ports/authorizer';
import { currentPrincipal, currentScope } from './current-user';

/** Team member management under /api/v1/members (admin only). */
export class MembersController {
  private readonly service: MembersService;
  private readonly authz: Authorizer;

  constructor(deps: { membersService: MembersService; authorizer: Authorizer }) {
    this.service = deps.membersService;
    this.authz = deps.authorizer;
  }

  private require(req: Request, action: string): void {
    if (!this.authz.check(currentPrincipal(req), { kind: 'member' }, action)) {
      throw new ForbiddenError();
    }
  }

  /** GET /members — list the acting admin's tenant (ADR-0033). */
  list = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'list');
    res.json(await this.service.list(currentScope(req)));
  };

  /** PATCH /members/:id/roles — set a member's roles within the admin's tenant. */
  setRoles = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'setRoles');
    const { roles } = setRolesSchema.parse(req.body);
    const member = await this.service.setRoles(req.params.id as string, roles, currentScope(req));
    res.json({ member });
  };
}
