import type { Request, Response } from 'express';
import { NotFoundError } from '../domain/errors';
import type { MandateRepository } from '../ports/mandate-repository';
import type { DocumentAiService } from '../services/document-ai-service';
import { currentScope, currentUserId } from './current-user';

/**
 * AI on top of matching: explain why a candidate fits a mandate (and, later,
 * generate an interview kit). Routes live under
 * /api/v1/mandates/:id/candidates/:talentId/*.
 */
export class MatchAiController {
  private readonly mandates: MandateRepository;
  private readonly ai: DocumentAiService;

  constructor(deps: {
    mandateRepository: MandateRepository;
    documentAiService: DocumentAiService;
  }) {
    this.mandates = deps.mandateRepository;
    this.ai = deps.documentAiService;
  }

  private async mandateOr404(scope: string, id: string) {
    const mandate = await this.mandates.findById(scope, id);
    if (!mandate) throw new NotFoundError(`Mandate ${id} not found`);
    return mandate;
  }

  /** POST /mandates/:id/candidates/:talentId/explain — why this candidate fits. */
  explain = async (req: Request, res: Response): Promise<void> => {
    const scope = currentScope(req);
    const mandate = await this.mandateOr404(scope, req.params.id as string);
    const explanation = await this.ai.explainMatch(
      scope,
      currentUserId(req),
      req.params.talentId as string,
      { role: mandate.role, location: mandate.location, client: mandate.client },
    );
    res.json({ explanation });
  };

  /** POST /mandates/:id/candidates/:talentId/interview-kit — tailored questions + scorecard. */
  interviewKit = async (req: Request, res: Response): Promise<void> => {
    const scope = currentScope(req);
    const mandate = await this.mandateOr404(scope, req.params.id as string);
    const kit = await this.ai.interviewKit(
      scope,
      currentUserId(req),
      req.params.talentId as string,
      {
        role: mandate.role,
        location: mandate.location,
        client: mandate.client,
      },
    );
    res.json({ kit });
  };

  /** POST /mandates/:id/candidates/:talentId/prep — candidate interview preparation. */
  prep = async (req: Request, res: Response): Promise<void> => {
    const scope = currentScope(req);
    const mandate = await this.mandateOr404(scope, req.params.id as string);
    const prep = await this.ai.candidatePrep(
      scope,
      currentUserId(req),
      req.params.talentId as string,
      { role: mandate.role, location: mandate.location, client: mandate.client },
      mandate.jobText,
    );
    res.json({ prep });
  };
}
