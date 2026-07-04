/* Locks the Capacitor web-side wiring (ADR-0040) at the source level: the config
   points at the real web build, carries a valid app id/name, and the cap:*
   scripts exist. The native build itself (cap add, apk/ipa, device install) is a
   manual dev-machine step and can't be exercised here — see docs/native-app.md. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');

describe('Capacitor config', () => {
  const cfg = read('capacitor.config.ts');

  it('Config_PointsWebDirAtTheViteBuildOutput', () => {
    expect(cfg).toMatch(/webDir:\s*'design\/myjob\/ui_kits\/recruiting\/dist'/);
  });

  it('Config_HasAReverseDomainAppIdAndName', () => {
    expect(cfg).toMatch(/appId:\s*'[a-z0-9.]+\.[a-z0-9.]+'/);
    expect(cfg).toMatch(/appName:\s*'[^']+'/);
  });
});

describe('Capacitor package wiring', () => {
  const pkg = JSON.parse(read('package.json'));

  it('Package_DeclaresCapacitorDevDependencies', () => {
    expect(pkg.devDependencies['@capacitor/cli']).toBeTruthy();
    expect(pkg.devDependencies['@capacitor/core']).toBeTruthy();
  });

  it('Package_ShipsTheCapScripts', () => {
    expect(pkg.scripts['cap:sync']).toContain('build:web');
    expect(pkg.scripts['cap:sync']).toContain('cap sync');
    expect(pkg.scripts['cap:add:android']).toBeTruthy();
    expect(pkg.scripts['cap:add:ios']).toBeTruthy();
  });
});
