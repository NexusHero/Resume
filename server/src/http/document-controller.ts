import type { Request, Response } from 'express';
import { saveDocumentsSchema } from '../domain/talent-documents';
import type { DocumentService } from '../services/document-service';
import { currentUserId } from './current-user';

/** A talent's resume + cover-letter documents under /api/v1/talents/:id/documents. */
export class DocumentController {
  private readonly service: DocumentService;

  constructor(deps: { documentService: DocumentService }) {
    this.service = deps.documentService;
  }

  get = async (req: Request, res: Response): Promise<void> => {
    const documents = await this.service.get(currentUserId(req), req.params.id as string);
    res.json({ documents });
  };

  save = async (req: Request, res: Response): Promise<void> => {
    const input = saveDocumentsSchema.parse(req.body);
    const documents = await this.service.save(currentUserId(req), req.params.id as string, input);
    res.json({ documents });
  };

  pdf = async (req: Request, res: Response): Promise<void> => {
    const talentId = req.params.id as string;
    const buffer = await this.service.renderPdf(currentUserId(req), talentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="documents-${talentId}.pdf"`);
    res.send(buffer);
  };
}
