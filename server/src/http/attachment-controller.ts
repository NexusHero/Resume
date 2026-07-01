import type { Request, Response } from 'express';
import { uploadAttachmentSchema } from '../domain/attachment';
import type { AttachmentService } from '../services/attachment-service';
import { currentScope } from './current-user';

/** Talent attachments: /api/v1/talents/:id/attachments and /api/v1/attachments/:id. */
export class AttachmentController {
  private readonly service: AttachmentService;

  constructor(deps: { attachmentService: AttachmentService }) {
    this.service = deps.attachmentService;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list(currentScope(req), req.params.id as string));
  };

  upload = async (req: Request, res: Response): Promise<void> => {
    const input = uploadAttachmentSchema.parse(req.body);
    const attachment = await this.service.upload(currentScope(req), req.params.id as string, input);
    res.status(201).json({ attachment });
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const { attachment, bytes } = await this.service.download(
      currentScope(req),
      req.params.id as string,
    );
    res.setHeader('Content-Type', attachment.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.name}"`);
    res.send(bytes);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(currentScope(req), req.params.id as string);
    res.sendStatus(204);
  };
}
