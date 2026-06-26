import { SystemClock } from '../../src/adapters/system-clock';
import { RandomIdGenerator } from '../../src/adapters/random-id-generator';
import { loadConfig } from '../../src/config';

describe('SystemClock', () => {
  const clock = new SystemClock();

  it('Clock_Today_IsIsoDate', () => {
    expect(clock.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('Clock_IsoNow_IsIsoTimestamp', () => {
    expect(clock.isoNow()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('Clock_Now_IsDate', () => {
    expect(clock.now()).toBeInstanceOf(Date);
  });
});

describe('RandomIdGenerator', () => {
  it('Id_Next_IsNonEmptyAlphanumeric', () => {
    expect(new RandomIdGenerator().next()).toMatch(/^[a-z0-9]+$/);
  });

  it('Id_Next_ProducesDistinctValues', () => {
    const gen = new RandomIdGenerator();
    const ids = new Set(Array.from({ length: 50 }, () => gen.next()));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe('loadConfig', () => {
  it('Config_EmptyEnv_UsesDefaultPort', () => {
    expect(loadConfig({}).port).toBe(4178);
  });

  it('Config_PortEnv_IsHonoured', () => {
    expect(loadConfig({ PORT: '5000' }).port).toBe(5000);
  });

  it('Config_DefaultArg_FallsBackToProcessEnv', () => {
    expect(loadConfig().port).toBeGreaterThan(0);
  });

  it('Config_Paths_AreUnderRoot', () => {
    const c = loadConfig({});
    expect(c.logFile.startsWith(c.storeDir)).toBe(true);
    expect(c.versionedPaths).toContain('archive/bewerbungen');
  });
});
