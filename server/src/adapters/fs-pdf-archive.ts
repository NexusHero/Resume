import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { PdfArchive } from '../ports/pdf-archive.js';

/** Writes archived PDFs into the store directory and returns their repo-relative path. */
export class FsPdfArchive implements PdfArchive {
  private readonly dir: string;
  private readonly rootDir: string;

  constructor(deps: { config: AppConfig }) {
    this.dir = deps.config.storeDir;
    this.rootDir = deps.config.rootDir;
  }

  async save(filenameHint: string, bytes: Buffer): Promise<string> {
    await fs.mkdir(this.dir, { recursive: true });
    const full = path.join(this.dir, `${filenameHint}.pdf`);
    await fs.writeFile(full, bytes);
    return path.relative(this.rootDir, full).split(path.sep).join('/');
  }
}
