import type { AppConfig } from '../config';
import type { JobSource } from '../ports/job-source';
import type { HttpFetch } from '../ports/http-fetch';
import type { Logger } from '../ports/logger';
import { ArbeitnowJobSource } from './arbeitnow-job-source';
import { BundesagenturJobSource } from './bundesagentur-job-source';
import { AdzunaJobSource } from './adzuna-job-source';
import { CompositeJobSource } from './composite-job-source';
import { SampleJobSource } from './sample-job-source';

export interface JobSourceFactoryDeps {
  config: AppConfig;
  logger: Logger;
  httpFetch: HttpFetch;
}

/**
 * Assembles the live job sources enabled in config. Real (keyless) sources are
 * the default; the curated offline SampleJobSource is opt-in (JOB_SOURCES=sample)
 * and is also the safety fallback if nothing is enabled.
 */
export function createJobSource(deps: JobSourceFactoryDeps): JobSource {
  const { config, logger, httpFetch } = deps;
  const cfg = config.jobSources;

  if (cfg.sample) {
    logger.info({}, 'offline sample job source (opt-in)');
    return new SampleJobSource();
  }

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
