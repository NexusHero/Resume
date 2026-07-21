import { jest } from '@jest/globals';
import type { Browser, Page } from 'puppeteer';
import type { AppConfig } from '../../src/config.js';
import { noopLogger } from '../support/fakes.js';

// `puppeteer` is a real ESM module with no port/fake in this codebase (it's the
// one genuinely side-effecting adapter, excluded from the fs-repository-style
// dependency injection used elsewhere) — mock it directly so `puppeteer.launch`
// is controllable without spawning a real Chromium. ESM modules must be mocked
// via `unstable_mockModule` + a dynamic import *after* the mock is registered;
// a static top-level `import` of the renderer would already have resolved the
// real module before a plain `jest.mock` factory ran.
const launch = jest.fn<() => Promise<Browser>>();
jest.unstable_mockModule('puppeteer', () => ({
  default: { launch },
}));

let PuppeteerPdfRenderer: typeof import('../../src/adapters/puppeteer-pdf-renderer.js').PuppeteerPdfRenderer;

beforeAll(async () => {
  ({ PuppeteerPdfRenderer } = await import('../../src/adapters/puppeteer-pdf-renderer.js'));
});

const fakeConfig = { rootDir: '/tmp', pdfRenderConcurrency: 2 } as unknown as AppConfig;

/** A Page double satisfying the calls `renderHtml` makes, nothing more. */
function fakePage(): Page {
  return {
    setRequestInterception: jest.fn(async () => {}),
    on: jest.fn(),
    setContent: jest.fn(async () => {}),
    evaluate: jest.fn(async () => undefined),
    pdf: jest.fn(async () => new Uint8Array([1, 2, 3])),
    close: jest.fn(async () => {}),
  } as unknown as Page;
}

/** A Browser double that records its `disconnected` handler so a test can fire it. */
function fakeBrowser(): { browser: Browser; emitDisconnected: () => void } {
  let disconnectedHandler: (() => void) | undefined;
  const browser = {
    newPage: jest.fn(async () => fakePage()),
    on: jest.fn((event: string, handler: () => void) => {
      if (event === 'disconnected') disconnectedHandler = handler;
    }),
    close: jest.fn(async () => {}),
  } as unknown as Browser;
  return { browser, emitDisconnected: () => disconnectedHandler?.() };
}

describe('PuppeteerPdfRenderer browser lifecycle', () => {
  beforeEach(() => {
    launch.mockReset();
  });

  it('LaunchRejectsOnce_NextCallRetriesAFreshLaunchInsteadOfThePoisonedPromise', async () => {
    const { browser } = fakeBrowser();
    launch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(browser);
    const renderer = new PuppeteerPdfRenderer({ config: fakeConfig, logger: noopLogger });

    await expect(renderer.renderHtml('<p>x</p>')).rejects.toThrow('boom');
    // A second attempt must not just replay the first (cached) rejection.
    const pdf = await renderer.renderHtml('<p>x</p>');
    expect(pdf).toBeInstanceOf(Buffer);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it('BrowserDisconnects_NextCallRelaunchesInsteadOfReusingTheDeadBrowser', async () => {
    const first = fakeBrowser();
    const second = fakeBrowser();
    launch.mockResolvedValueOnce(first.browser).mockResolvedValueOnce(second.browser);
    const renderer = new PuppeteerPdfRenderer({ config: fakeConfig, logger: noopLogger });

    await renderer.renderHtml('<p>x</p>');
    expect(launch).toHaveBeenCalledTimes(1);

    first.emitDisconnected(); // simulate Chromium crashing/being killed
    await renderer.renderHtml('<p>x</p>');
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it('StaleDisconnectFromAReplacedBrowser_DoesNotClobberTheCurrentOne', async () => {
    // A late/duplicate 'disconnected' from an already-superseded browser must not
    // null out the slot a newer, already-relaunched browser is occupying.
    const first = fakeBrowser();
    const second = fakeBrowser();
    launch.mockResolvedValueOnce(first.browser).mockResolvedValueOnce(second.browser);
    const renderer = new PuppeteerPdfRenderer({ config: fakeConfig, logger: noopLogger });

    await renderer.renderHtml('<p>x</p>'); // launches `first`
    first.emitDisconnected(); // `first` dies, slot cleared
    await renderer.renderHtml('<p>x</p>'); // relaunches `second`

    first.emitDisconnected(); // stale event from `first` arrives again
    await renderer.renderHtml('<p>x</p>'); // must still reuse `second`, not relaunch

    expect(launch).toHaveBeenCalledTimes(2);
  });
});
