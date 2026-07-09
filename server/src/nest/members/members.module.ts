import { Controller, Get, Inject, Module, UseGuards } from '@nestjs/common';
import { MembersService } from '../../services/members-service.js';
import type { UserRepository } from '../../ports/user-repository.js';
import { AuthGuard } from '../auth.guard.js';
import { Can, RolesGuard } from '../authorization.js';
import { CurrentScope } from '../params.js';
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
