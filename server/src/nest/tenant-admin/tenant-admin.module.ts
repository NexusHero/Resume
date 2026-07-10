import { Body, Controller, Get, Inject, Module, Param, Patch, UseGuards } from '@nestjs/common';
import { setTenantStatusSchema } from '../../domain/tenant.js';
import { setRolesSchema } from '../../domain/user.js';
import { TenantService } from '../../services/tenant-service.js';
import type { MembersService } from '../../services/members-service.js';
import type { TenantRepository } from '../../ports/tenant-repository.js';
import type { UserRepository } from '../../ports/user-repository.js';
import { AuthGuard } from '../auth.guard.js';
import { SuperAdminGuard } from '../authorization.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { MembersModule } from '../members/members.module.js';
import { TENANT_SERVICE, MEMBERS_SERVICE, TENANT_REPOSITORY, USER_REPOSITORY } from '../tokens.js';

/**
 * Cross-tenant admin under /api/v1/admin/tenants (ADR-0051 port of
 * TenantAdminController) — gated to the instance super-admin (ADR-0037).
 */
@Controller('api/v1/admin/tenants')
@UseGuards(AuthGuard, SuperAdminGuard)
export class TenantAdminController {
  constructor(
    @Inject(TENANT_SERVICE) private readonly service: TenantService,
    @Inject(MEMBERS_SERVICE) private readonly members: MembersService,
  ) {}

  @Get()
  listTenants() {
    return this.service.list();
  }

  @Patch(':id')
  async setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setTenantStatusSchema))
    body: ReturnType<typeof setTenantStatusSchema.parse>,
  ) {
    return { tenant: await this.service.setStatus(id, body.status) };
  }

  @Get(':id/members')
  listMembers(@Param('id') id: string) {
    return this.members.list(id);
  }

  @Patch(':id/members/:userId/roles')
  async setMemberRoles(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(setRolesSchema)) body: ReturnType<typeof setRolesSchema.parse>,
  ) {
    return { member: await this.members.setRoles(userId, body.roles, id) };
  }
}

@Module({
  imports: [MembersModule], // provides MEMBERS_SERVICE
  controllers: [TenantAdminController],
  providers: [
    SuperAdminGuard,
    {
      provide: TENANT_SERVICE,
      useFactory: (tenantRepository: TenantRepository, userRepository: UserRepository) =>
        new TenantService({ tenantRepository, userRepository }),
      inject: [TENANT_REPOSITORY, USER_REPOSITORY],
    },
  ],
})
export class TenantAdminModule {}
