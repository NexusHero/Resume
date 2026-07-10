import { puppeteerLaunchOptions } from '../../src/adapters/puppeteer-pdf-renderer.js';

describe('puppeteerLaunchOptions', () => {
  it('WithExecutablePath_UsesSystemChromium', () => {
    // In the production container Puppeteer's own download is skipped and a
    // system Chromium is installed; the launcher must honour its path.
    const opts = puppeteerLaunchOptions({ PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium' });
    expect(opts.executablePath).toBe('/usr/bin/chromium');
    expect(opts.headless).toBe(true);
    expect(opts.args).toContain('--no-sandbox');
  });

  it('WithoutExecutablePath_LetsPuppeteerResolveItsOwn', () => {
    const opts = puppeteerLaunchOptions({});
    expect(opts.executablePath).toBeUndefined();
    expect(opts.headless).toBe(true);
  });

  it('BlankExecutablePath_IsIgnored', () => {
    expect(
      puppeteerLaunchOptions({ PUPPETEER_EXECUTABLE_PATH: '   ' }).executablePath,
    ).toBeUndefined();
  });
});
