import type { PdfArchive } from '../ports/pdf-archive.js';

/**
 * The one object-storage operation the archive needs. Keeping it a tiny
 * interface (rather than depending on the AWS SDK here) lets S3PdfArchive be
 * unit-tested with a fake, and lets any S3-compatible backend (AWS, Cloudflare
 * R2, Hetzner, MinIO) sit behind the same class.
 */
export interface ObjectPutter {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
}

/**
 * Archives finished application PDFs in object storage (ADR-0031). Write-only —
 * like the filesystem archive, the returned key is a durable record of where the
 * PDF was stored, not a served path. Unlike the filesystem, it survives a
 * redeploy and is shared across instances.
 */
export class S3PdfArchive implements PdfArchive {
  private readonly putter: ObjectPutter;
  private readonly prefix: string;

  constructor(deps: { putter: ObjectPutter; prefix?: string }) {
    this.putter = deps.putter;
    // Normalise to at most one trailing slash, no leading slash.
    this.prefix = (deps.prefix ?? '').replace(/^\/+/, '').replace(/\/+$/, '');
  }

  async save(filenameHint: string, bytes: Buffer): Promise<string> {
    const key = `${this.prefix ? `${this.prefix}/` : ''}${filenameHint}.pdf`;
    await this.putter.put(key, bytes, 'application/pdf');
    return key;
  }
}
