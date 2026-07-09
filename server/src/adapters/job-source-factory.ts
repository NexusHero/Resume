import type { AppConfig } from '../config.js';
import type { JobSource } from '../ports/job-source.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';
import { ArbeitnowJobSource } from './arbeitnow-job-source.js';
import { BundesagenturJobSource } from './bundesagentur-job-source.js';
import { AdzunaJobSource } from './adzuna-job-source.js';
import { CompositeJobSource } from './composite-job-source.js';
import { EmptyJobSource } from './empty-job-source.js';
import { resilientFetch } from './resilient-fetch.js';

export interface JobSourceFactoryDeps {
  config: AppConfig;
  logger: Logger;
  httpFetch: HttpFetch;
}

/**
 * Assembles the live job sources enabled in config. The default install enables
 * the keyless Arbeitnow board, so real postings flow without any setup. With
 * every board explicitly disabled (JOB_SOURCES="") it returns an EmptyJobSource
 * — the search shows no postings rather than any fabricated sample data.
 */
export function createJobSource(deps: JobSourceFactoryDeps): JobSource {
  const { config, logger } = deps;
  const cfg = config.jobSources;
  // Every board request gets a timeout + bounded retry so a slow/flaky board
  // can't hang or silently empty the search (see resilient-fetch).
  const httpFetch = resilientFetch(deps.httpFetch, {
    timeoutMs: cfg.requestTimeoutMs,
    retries: cfg.retries,
    logger,
  });
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
    logger.warn({}, 'no job sources configured (JOB_SOURCES="") — search returns no postings');
    return new EmptyJobSource();
  }
  logger.info({ sources: sources.map((s) => s.name) }, 'live job sources enabled');
  return new CompositeJobSource(sources, logger);
}
