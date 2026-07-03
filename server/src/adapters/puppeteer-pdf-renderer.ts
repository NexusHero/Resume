import path from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import type { AppConfig } from '../config';
import type { Logger } from '../ports/logger';
import type { CoverLetterOptions, PdfRenderer } from '../ports/pdf-renderer';
import { Semaphore } from './semaphore';

// `document` is only referenced inside functions serialized to the browser by
// Puppeteer; this is a Node project without the DOM lib, so declare it loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const document: any;

/** Renders the self-contained HTML pages to vector PDF via headless Chromium. */
export class PuppeteerPdfRenderer implements PdfRenderer {
  private readonly rootDir: string;
  private readonly logger: Logger;
  private browserPromise: Promise<Browser> | null = null;
  // One shared browser, but a bounded number of concurrent pages (ADR-0032):
  // a burst of exports can't spawn unlimited Chromium tabs and blow up memory.
  private readonly renderPool: Semaphore;

  constructor(deps: { config: AppConfig; logger: Logger }) {
    this.rootDir = deps.config.rootDir;
    this.logger = deps.logger;
    this.renderPool = new Semaphore(deps.config.pdfRenderConcurrency);
  }

  private browser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    }
    return this.browserPromise;
  }

  private fileUrl(rel: string): string {
    return 'file://' + path.join(this.rootDir, rel);
  }

  private async toPdf(page: Page): Promise<Buffer> {
    const bytes = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      timeout: 60000,
    });
    return Buffer.from(bytes);
  }

  /** Acquire a render permit, open a page, run `fn`, then always close the page
      and release the permit. The single place page lifecycle + pooling live. */
  private withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    return this.renderPool.run(async () => {
      const browser = await this.browser();
      const page = await browser.newPage();
      try {
        return await fn(page);
      } finally {
        await page.close();
      }
    });
  }

  async renderCv({ language }: { language: 'de' | 'en' }): Promise<Buffer> {
    return this.withPage(async (page) => {
      await page.goto(this.fileUrl('design/documents/ui_kits/cv/index.html'), {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
      await page.waitForSelector('.cv-page', { timeout: 15000 });
      if (language === 'de') {
        await page.click('#lang button[data-v="de"]');
        await page.waitForFunction(() => document.documentElement.lang === 'de', { timeout: 8000 });
      }
      await page.evaluate(async () => {
        try {
          await document.fonts.ready;
        } catch {
          /* fonts API unavailable */
        }
      });
      return this.toPdf(page);
    });
  }

  async renderCoverLetter(options: CoverLetterOptions): Promise<Buffer> {
    return this.withPage(async (page) => {
      await page.goto(this.fileUrl('design/documents/ui_kits/cover-letter/index.html'), {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
      await page.waitForSelector('.cl-page', { timeout: 15000 });
      await page.evaluate((o: CoverLetterOptions) => {
        const esc = (s: unknown) =>
          String(s ?? '').replace(
            /[&<>]/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!,
          );
        if (o.company || o.street || o.postalCodeCity || o.contactName) {
          const lines = ['<strong>' + esc(o.company ?? '') + '</strong>'];
          if (o.contactName) lines.push(esc(o.contactName));
          if (o.street) lines.push(esc(o.street));
          if (o.postalCodeCity) lines.push(esc(o.postalCodeCity));
          const r = document.querySelector('.cl-recipient');
          if (r) r.innerHTML = lines.join('<br>');
        }
        if (o.position) {
          const s = document.querySelector('.cl-subject');
          if (s)
            s.textContent =
              'Application as ' + o.position + (o.reference ? ' — Reference: ' + o.reference : '');
        }
        if (o.location || o.date) {
          const d = document.querySelector('.cl-date');
          if (d)
            d.textContent =
              (o.location ?? '') + (o.location && o.date ? ', ' : '') + (o.date ?? '');
        }
      }, options);
      await page.evaluate(async () => {
        try {
          await document.fonts.ready;
        } catch {
          /* fonts API unavailable */
        }
      });
      return this.toPdf(page);
    });
  }

  async renderHtml(html: string): Promise<Buffer> {
    return this.withPage(async (page) => {
      await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(async () => {
        try {
          await document.fonts.ready;
        } catch {
          /* fonts API unavailable */
        }
      });
      return this.toPdf(page);
    });
  }

  async close(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
      this.logger.debug({}, 'renderer browser closed');
    }
  }
}
