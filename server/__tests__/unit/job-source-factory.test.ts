import { createJobSource } from '../../src/adapters/job-source-factory.js';
import { CompositeJobSource } from '../../src/adapters/composite-job-source.js';
import { EmptyJobSource } from '../../src/adapters/empty-job-source.js';
import { loadConfig, type AppConfig } from '../../src/config.js';
import type { HttpFetch } from '../../src/ports/http-fetch.js';
import { noopLogger } from '../support/fakes.js';

const noHttp: HttpFetch = async () => ({ ok: true, status: 200, json: async () => ({}) });

function build(env: NodeJS.ProcessEnv): AppConfig {
  return loadConfig(env);
}

describe('createJobSource', () => {
  it('NoEnv_DefaultsToKeylessArbeitnowComposite', () => {
    // A plain install (JOB_SOURCES unset) queries the real, keyless Arbeitnow
    // board — never a fabricated sample source.
    const config = build({});
    expect(config.jobSources.arbeitnow.enabled).toBe(true);
    const src = createJobSource({ config, logger: noopLogger, httpFetch: noHttp });
    expect(src).toBeInstanceOf(CompositeJobSource);
    expect(src.name).toBe('composite');
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

  it('LiveSourcesEnabled_ReturnsComposite', () => {
    const src = createJobSource({
      config: build({ JOB_SOURCES: 'arbeitnow,bundesagentur' }),
      logger: noopLogger,
      httpFetch: noHttp,
    });
    expect(src).toBeInstanceOf(CompositeJobSource);
    expect(src.name).toBe('composite');
  });

  it('AdzunaWithoutCredentials_StaysDisabled', () => {
    // listed but no keys → Adzuna must not be enabled (would only 401); with no
    // other board it degrades to the empty source, never a sample.
    const config = build({ JOB_SOURCES: 'adzuna' });
    expect(config.jobSources.adzuna.enabled).toBe(false);
    const src = createJobSource({ config, logger: noopLogger, httpFetch: noHttp });
    expect(src).toBeInstanceOf(EmptyJobSource);
  });

  it('AdzunaWithCredentials_IsEnabled', () => {
    const config = build({
      JOB_SOURCES: 'adzuna',
      ADZUNA_APP_ID: 'id',
      ADZUNA_APP_KEY: 'key',
    });
    expect(config.jobSources.adzuna.enabled).toBe(true);
    expect(createJobSource({ config, logger: noopLogger, httpFetch: noHttp })).toBeInstanceOf(
      CompositeJobSource,
    );
  });
});
