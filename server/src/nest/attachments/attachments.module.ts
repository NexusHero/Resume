import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { uploadAttachmentSchema } from '../../domain/attachment.js';
import { AttachmentService } from '../../services/attachment-service.js';
import type { AttachmentStore } from '../../ports/attachment-store.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { UserRepository } from '../../ports/user-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  ATTACHMENT_SERVICE,
  ATTACHMENT_STORE,
  TALENT_REPOSITORY,
  USER_REPOSITORY,
  CLOCK,
  ID_GENERATOR,
} from '../tokens.js';

/** Talent attachments (CVs, docs) under /api/v1 (ADR-0051 port of AttachmentController). */
@Controller('api/v1')
@UseGuards(AuthGuard)
export class AttachmentsController {
  constructor(@Inject(ATTACHMENT_SERVICE) private readonly service: AttachmentService) {}

  @Get('talents/:id/attachments')
  list(@CurrentScope() scope: string, @Param('id') talentId: string) {
    return this.service.list(scope, talentId);
  }

  @Post('talents/:id/attachments')
  @HttpCode(201)
  async upload(
    @CurrentScope() scope: string,
    @Param('id') talentId: string,
    @Body(new ZodValidationPipe(uploadAttachmentSchema))
    input: ReturnType<typeof uploadAttachmentSchema.parse>,
  ) {
    return { attachment: await this.service.upload(scope, talentId, input) };
  }

  @Get('attachments/:id')
  async download(@CurrentScope() scope: string, @Param('id') id: string, @Res() res: Response) {
    const { attachment, bytes } = await this.service.download(scope, id);
    res.setHeader('Content-Type', attachment.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.name}"`);
    res.send(bytes);
  }

  @Delete('attachments/:id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string): Promise<void> {
    await this.service.remove(scope, id);
  }
}

@Module({
  controllers: [AttachmentsController],
  providers: [
    {
      provide: ATTACHMENT_SERVICE,
      useFactory: (
        attachmentStore: AttachmentStore,
        talentRepository: TalentRepository,
        userRepository: UserRepository,
        clock: Clock,
        idGenerator: IdGenerator,
      ) =>
        new AttachmentService({
          attachmentStore,
          talentRepository,
          userRepository,
          clock,
          idGenerator,
        }),
      inject: [ATTACHMENT_STORE, TALENT_REPOSITORY, USER_REPOSITORY, CLOCK, ID_GENERATOR],
    },
  ],
})
export class AttachmentsModule {}
