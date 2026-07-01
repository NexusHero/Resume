import type { Request, Response } from 'express';
import { saveDocumentsSchema } from '../domain/talent-documents';
import { aiSuggestSchema } from '../domain/document-ai';
import { parseRequestSchema, parsePdfRequestSchema } from '../domain/document-parse';
import { atsRequestSchema } from '../domain/ats-ai';
import { pitchRequestSchema } from '../domain/candidate-pitch';
import { outreachRequestSchema } from '../domain/outreach';
import type { DocumentService } from '../services/document-service';
import type { DocumentAiService } from '../services/document-ai-service';
import { currentScope, currentUserId } from './current-user';

/**
 * A talent's resume + cover-letter documents under /api/v1/talents/:id/documents.
 * Documents belong to the shared team (`currentScope`); the AI helpers also take
 * the caller's own `currentUserId` so they use that recruiter's personal LLM key.
 */
export class DocumentController {
  private readonly service: DocumentService;
  private readonly ai: DocumentAiService;

  constructor(deps: { documentService: DocumentService; documentAiService: DocumentAiService }) {
    this.service = deps.documentService;
    this.ai = deps.documentAiService;
  }

  get = async (req: Request, res: Response): Promise<void> => {
    const documents = await this.service.get(currentScope(req), req.params.id as string);
    res.json({ documents });
  };

  save = async (req: Request, res: Response): Promise<void> => {
    const input = saveDocumentsSchema.parse(req.body);
    const documents = await this.service.save(currentScope(req), req.params.id as string, input);
    res.json({ documents });
  };

  pdf = async (req: Request, res: Response): Promise<void> => {
    const talentId = req.params.id as string;
    const buffer = await this.service.renderPdf(currentScope(req), talentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="documents-${talentId}.pdf"`);
    res.send(buffer);
  };

  dossier = async (req: Request, res: Response): Promise<void> => {
    const talentId = req.params.id as string;
    const q = req.query;
    const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
    const attachmentIds = (str(q.attachments) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const buffer = await this.service.renderDossierPdf(
      currentScope(req),
      talentId,
      {
        company: str(q.company),
        contactName: str(q.contact),
        street: str(q.street),
        postalCodeCity: str(q.plzOrt),
        subject: str(q.subject),
      },
      attachmentIds,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="dossier-${talentId}.pdf"`);
    res.send(buffer);
  };

  aiSuggest = async (req: Request, res: Response): Promise<void> => {
    const { action, role, company } = aiSuggestSchema.parse(req.body);
    const suggestion = await this.ai.suggest(
      currentScope(req),
      currentUserId(req),
      req.params.id as string,
      action,
      { role, company },
    );
    res.json({ suggestion });
  };

  parse = async (req: Request, res: Response): Promise<void> => {
    const { text } = parseRequestSchema.parse(req.body);
    const parsed = await this.ai.parse(
      currentScope(req),
      currentUserId(req),
      req.params.id as string,
      text,
    );
    res.json({ parsed });
  };

  parsePdf = async (req: Request, res: Response): Promise<void> => {
    const { dataBase64 } = parsePdfRequestSchema.parse(req.body);
    const pdf = Buffer.from(dataBase64, 'base64');
    const parsed = await this.ai.parsePdf(
      currentScope(req),
      currentUserId(req),
      req.params.id as string,
      pdf,
    );
    res.json({ parsed });
  };

  ats = async (req: Request, res: Response): Promise<void> => {
    const { jobText } = atsRequestSchema.parse(req.body);
    const result = await this.ai.scoreAgainstJob(
      currentScope(req),
      currentUserId(req),
      req.params.id as string,
      jobText,
    );
    res.json({ ats: result });
  };

  pitch = async (req: Request, res: Response): Promise<void> => {
    const { mandateContext } = pitchRequestSchema.parse(req.body);
    const pitch = await this.ai.pitchForMandate(
      currentScope(req),
      currentUserId(req),
      req.params.id as string,
      mandateContext,
    );
    res.json({ pitch });
  };

  outreach = async (req: Request, res: Response): Promise<void> => {
    const opts = outreachRequestSchema.parse(req.body);
    const message = await this.ai.outreach(
      currentScope(req),
      currentUserId(req),
      req.params.id as string,
      opts,
    );
    res.json({ message });
  };
}
