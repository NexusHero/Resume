import { readFileSync } from 'node:fs';
import type { AppConfig } from '../config.js';
import type { JobSource } from '../ports/job-source.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';
import { jobSourceDescriptorsSchema } from '../domain/job-source-descriptor.js';
import type { JobSourceDescriptor } from '../domain/job-source-descriptor.js';
import { ArbeitnowJobSource } from './arbeitnow-job-source.js';
import { BundesagenturJobSource } from './bundesagentur-job-source.js';
import { AdzunaJobSource } from './adzuna-job-source.js';
import { RestJobSource } from './rest-job-source.js';
import { BUILTIN_JOB_SOURCE_DESCRIPTORS } from './builtin-job-sources.js';
import { CompositeJobSource } from './composite-job-source.js';
import { EmptyJobSource } from './empty-job-source.js';
import { resilientFetch } from './resilient-fetch.js';
import { circuitBreaker } from './circuit-breaker.js';

export interface JobSourceFactoryDeps {
  config: AppConfig;
  logger: Logger;
  httpFetch: HttpFetch;
}

/** Load extra descriptors from JOB_SOURCES_FILE; a bad file is skipped, never fatal. */
function loadFileDescriptors(file: string | null, logger: Logger): JobSourceDescriptor[] {
  if (!file) return [];
  try {
    const parsed = jobSourceDescriptorsSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
    logger.info({ file, count: parsed.length }, 'loaded job-source descriptors from file');
    return parsed;
  } catch (err) {
    logger.warn({ file, err: String(err) }, 'could not load JOB_SOURCES_FILE — skipping');
    return [];
  }
}

/**
 * Assembles every enabled job source into one composite (ADR-0050). By default
 * ALL sources are on and a search fans out across all of them at once: the
 * keyless hand-written boards (Arbeitnow, Bundesagentur), Adzuna when its
 * credentials are set, the built-in descriptor boards (Remotive, Jobicy, Remote
 * OK), and any extra descriptors from JOB_SOURCES_FILE. A source is skipped only
 * when it is on the JOB_SOURCES_DISABLED deny-list, absent from an explicit
 * legacy JOB_SOURCES allow-list, or its descriptor sets `enabled: false`. With
 * every source off it returns an EmptyJobSource — an honest empty search, never
 * fabricated sample data.
 */
export function createJobSource(deps: JobSourceFactoryDeps): JobSource {
  const { config, logger } = deps;
  const cfg = config.jobSources;
  // Every board request gets a timeout + bounded retry so a slow/flaky board
  // can't hang or silently empty the search (see resilient-fetch).
  const resilientHttpFetch = resilientFetch(deps.httpFetch, {
    timeoutMs: cfg.requestTimeoutMs,
    retries: cfg.retries,
    logger,
  });
  // On top of that, each board gets its OWN circuit breaker (a fresh instance
  // per source, never shared) so a board that stays down for a while is
  // failed fast — no more per-search timeout+retries hammering it — while its
  // healthy neighbors are unaffected (see circuit-breaker.ts).
  const forSource = (label: string) =>
    circuitBreaker(resilientHttpFetch, {
      failureThreshold: cfg.circuitBreakerThreshold,
      resetTimeoutMs: cfg.circuitBreakerResetMs,
      logger,
      label,
    });

  // Same allow/deny rule the config applied to the hand-written boards, reused
  // for descriptor boards so one switch governs every source uniformly.
  const on = (name: string): boolean =>
    (cfg.allowList === null || cfg.allowList.includes(name.toLowerCase())) &&
    !cfg.disabled.includes(name.toLowerCase());

  const sources: JobSource[] = [];

  if (cfg.arbeitnow.enabled) {
    sources.push(new ArbeitnowJobSource({ httpFetch: forSource('Arbeitnow'), logger }));
  }
  if (cfg.bundesagentur.enabled) {
    sources.push(
      new BundesagenturJobSource({
        httpFetch: forSource('Bundesagentur'),
        logger,
        apiKey: cfg.bundesagentur.apiKey,
      }),
    );
  }
  if (cfg.adzuna.enabled) {
    sources.push(
      new AdzunaJobSource({
        httpFetch: forSource('Adzuna'),
        logger,
        appId: cfg.adzuna.appId,
        appKey: cfg.adzuna.appKey,
        country: cfg.adzuna.country,
      }),
    );
  }

  const descriptors = [
    ...BUILTIN_JOB_SOURCE_DESCRIPTORS,
    ...loadFileDescriptors(cfg.descriptorsFile, logger),
  ];
  for (const descriptor of descriptors) {
    if (descriptor.enabled === false || !on(descriptor.name)) continue;
    sources.push(new RestJobSource({ descriptor, httpFetch: forSource(descriptor.name), logger }));
  }

  if (sources.length === 0) {
    logger.warn({}, 'no job sources enabled — search returns no postings');
    return new EmptyJobSource();
  }
  logger.info({ sources: sources.map((s) => s.name) }, 'live job sources enabled');
  return new CompositeJobSource(sources, logger);
}
