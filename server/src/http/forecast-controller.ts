import type { Request, Response } from 'express';
import type { ForecastService } from '../services/forecast-service.js';
import { currentScope } from './current-user.js';

/** Weighted pipeline revenue forecast under /api/v1/forecast. */
export class ForecastController {
  private readonly service: ForecastService;

  constructor(deps: { forecastService: ForecastService }) {
    this.service = deps.forecastService;
  }

  /** GET /forecast — expected revenue across the live pipeline. */
  get = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.forecast(currentScope(req)));
  };
}
