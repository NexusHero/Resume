import { Body, Controller, Get, Inject, Module, Param, Patch, UseGuards } from '@nestjs/common';
import { setRolesSchema } from '../../domain/user.js';
import { MembersService } from '../../services/members-service.js';
import type { UserRepository } from '../../ports/user-repository.js';
import { AuthGuard } from '../auth.guard.js';
import { Can, RolesGuard } from '../authorization.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { MEMBERS_SERVICE, USER_REPOSITORY } from '../tokens.js';

/** Team members under /api/v1/members (ADR-0051 port of MembersController). */
@Controller('api/v1/members')
@UseGuards(AuthGuard, RolesGuard)
export class MembersController {
  constructor(@Inject(MEMBERS_SERVICE) private readonly service: MembersService) {}

  @Get()
  @Can('member', 'list')
  list(@CurrentScope() scope: string) {
    return this.service.list(scope);
  }

  @Patch(':id/roles')
  @Can('member', 'setRoles')
  async setRoles(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setRolesSchema)) body: ReturnType<typeof setRolesSchema.parse>,
  ) {
    return { member: await this.service.setRoles(id, body.roles, scope) };
  }
}

@Module({
  controllers: [MembersController],
  providers: [
    RolesGuard,
    {
      provide: MEMBERS_SERVICE,
      useFactory: (userRepository: UserRepository) => new MembersService({ userRepository }),
      inject: [USER_REPOSITORY],
    },
  ],
  exports: [MEMBERS_SERVICE],
})
export class MembersModule {}
