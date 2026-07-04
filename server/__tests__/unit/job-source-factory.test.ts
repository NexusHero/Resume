import { createJobSource } from '../../src/adapters/job-source-factory.js';
import { CompositeJobSource } from '../../src/adapters/composite-job-source.js';
import { SampleJobSource } from '../../src/adapters/sample-job-source.js';
import { loadConfig, type AppConfig } from '../../src/config.js';
import type { HttpFetch } from '../../src/ports/http-fetch.js';
import { noopLogger } from '../support/fakes.js';

const noHttp: HttpFetch = async () => ({ ok: true, status: 200, json: async () => ({}) });

function build(env: NodeJS.ProcessEnv): AppConfig {
  return loadConfig(env);
}

describe('createJobSource', () => {
  it('NoSourcesConfigured_FallsBackToSample', () => {
    const src = createJobSource({ config: build({}), logger: noopLogger, httpFetch: noHttp });
    expect(src).toBeInstanceOf(SampleJobSource);
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
    // listed but no keys → Adzuna must not be enabled (would only 401)
    const config = build({ JOB_SOURCES: 'adzuna' });
    expect(config.jobSources.adzuna.enabled).toBe(false);
    const src = createJobSource({ config, logger: noopLogger, httpFetch: noHttp });
    expect(src).toBeInstanceOf(SampleJobSource);
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
