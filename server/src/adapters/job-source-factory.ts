import type { AppConfig } from '../config.js';
import type { JobSource } from '../ports/job-source.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';
import { ArbeitnowJobSource } from './arbeitnow-job-source.js';
import { BundesagenturJobSource } from './bundesagentur-job-source.js';
import { AdzunaJobSource } from './adzuna-job-source.js';
import { CompositeJobSource } from './composite-job-source.js';
import { SampleJobSource } from './sample-job-source.js';

export interface JobSourceFactoryDeps {
  config: AppConfig;
  logger: Logger;
  httpFetch: HttpFetch;
}

/**
 * Assembles the live job sources enabled in config. With none enabled (the
 * default — no API keys, offline, CI) it falls back to the curated
 * SampleJobSource so the search always works.
 */
export function createJobSource(deps: JobSourceFactoryDeps): JobSource {
  const { config, logger, httpFetch } = deps;
  const cfg = config.jobSources;
  const sources: JobSource[] = [];

  if (cfg.arbeitnow.enabled) {
    sources.push(new ArbeitnowJobSource({ httpFetch, logger }));
  }
  if (cfg.bundesagentur.enabled) {
    sources.push(
      new BundesagenturJobSource({ httpFetch, logger, apiKey: cfg.bundesagentur.apiKey }),
    );
  }
  if (cfg.adzuna.enabled) {
    sources.push(
      new AdzunaJobSource({
        httpFetch,
        logger,
        appId: cfg.adzuna.appId,
        appKey: cfg.adzuna.appKey,
        country: cfg.adzuna.country,
      }),
    );
  }

  if (sources.length === 0) {
    logger.info({}, 'no live job sources configured — using offline sample');
    return new SampleJobSource();
  }
  logger.info({ sources: sources.map((s) => s.name) }, 'live job sources enabled');
  return new CompositeJobSource(sources, logger);
}
