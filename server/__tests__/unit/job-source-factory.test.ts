import { createJobSource } from '../../src/adapters/job-source-factory.js';
import { CompositeJobSource } from '../../src/adapters/composite-job-source.js';
import { EmptyJobSource } from '../../src/adapters/empty-job-source.js';
import { BUILTIN_JOB_SOURCE_DESCRIPTORS } from '../../src/adapters/builtin-job-sources.js';
import { loadConfig, type AppConfig } from '../../src/config.js';
import type { HttpFetch } from '../../src/ports/http-fetch.js';
import { noopLogger } from '../support/fakes.js';

const noHttp: HttpFetch = async () => ({ ok: true, status: 200, json: async () => ({}) });

function build(env: NodeJS.ProcessEnv): AppConfig {
  return loadConfig(env);
}

/** The composite exposes no member list, so probe which boards it fans out to. */
function sourceNames(env: NodeJS.ProcessEnv): string[] {
  const src = createJobSource({ config: build(env), logger: noopLogger, httpFetch: noHttp });
  if (!(src instanceof CompositeJobSource)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (src as any).sources.map((s: { name: string }) => s.name);
}

describe('createJobSource', () => {
  it('NoEnv_EnablesAllKeylessBoardsAtOnce', () => {
    // A plain install fans out across every keyless board (ADR-0050): the two
    // hand-written boards plus the built-in descriptor boards. Adzuna stays off
    // until its credentials are set.
    const config = build({});
    expect(config.jobSources.arbeitnow.enabled).toBe(true);
    expect(config.jobSources.bundesagentur.enabled).toBe(true);
    expect(config.jobSources.adzuna.enabled).toBe(false);

    const names = sourceNames({});
    expect(names).toEqual(
      expect.arrayContaining([
        'Arbeitnow',
        'Bundesagentur',
        ...BUILTIN_JOB_SOURCE_DESCRIPTORS.map((d) => d.name),
      ]),
    );
    expect(names).not.toContain('Adzuna');
  });

  it('JobSourcesEmptyString_ReturnsEmptySource', () => {
    // Explicit opt-out: no board configured → an honest empty source, not mock data.
    const src = createJobSource({
      config: build({ JOB_SOURCES: '' }),
      logger: noopLogger,
      httpFetch: noHttp,
    });
    expect(src).toBeInstanceOf(EmptyJobSource);
    expect(src.name).toBe('none');
  });

  it('JobSources_LegacyAllowList_RestrictsToNamedBoards', () => {
    // The legacy allow-list still works and now governs descriptor boards too.
    const names = sourceNames({ JOB_SOURCES: 'arbeitnow,remotive' });
    expect(names.sort()).toEqual(['Arbeitnow', 'Remotive']);
  });

  it('JobSourcesDisabled_DenyListTurnsOneBoardOff', () => {
    const names = sourceNames({ JOB_SOURCES_DISABLED: 'bundesagentur,remote ok' });
    expect(names).toContain('Arbeitnow');
    expect(names).toContain('Remotive');
    expect(names).not.toContain('Bundesagentur');
    expect(names).not.toContain('Remote OK');
  });

  it('AdzunaWithCredentials_JoinsTheComposite', () => {
    const config = build({ ADZUNA_APP_ID: 'id', ADZUNA_APP_KEY: 'key' });
    expect(config.jobSources.adzuna.enabled).toBe(true);
    expect(sourceNames({ ADZUNA_APP_ID: 'id', ADZUNA_APP_KEY: 'key' })).toContain('Adzuna');
  });

  it('AdzunaWithoutCredentials_StaysOff', () => {
    expect(build({}).jobSources.adzuna.enabled).toBe(false);
    expect(sourceNames({})).not.toContain('Adzuna');
  });
});
