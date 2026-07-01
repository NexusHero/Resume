import type { Request, Response } from 'express';
import { createObservationSchema } from '../domain/interview-observation';
import type { InterviewObservationService } from '../services/interview-observation-service';
import { currentScope } from './current-user';

/** Interview-observation flywheel under /api/v1/mandates/:id/observations. */
export class ObservationController {
  private readonly service: InterviewObservationService;

  constructor(deps: { interviewObservationService: InterviewObservationService }) {
    this.service = deps.interviewObservationService;
  }

  /** POST /mandates/:id/observations — record an interview experience. */
  record = async (req: Request, res: Response): Promise<void> => {
    const input = createObservationSchema.parse(req.body);
    const observation = await this.service.record(
      currentScope(req),
      req.params.id as string,
      input,
    );
    res.status(201).json({ observation });
  };

  /** GET /mandates/:id/observations — the company's aggregated knowledge. */
  forMandate = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.forMandate(currentScope(req), req.params.id as string));
  };
}
