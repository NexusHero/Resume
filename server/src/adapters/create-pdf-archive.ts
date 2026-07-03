import type { AppConfig } from '../config';
import type { PdfArchive } from '../ports/pdf-archive';
import { FsPdfArchive } from './fs-pdf-archive';
import { S3PdfArchive } from './s3-pdf-archive';
import { AwsS3Putter } from './aws-s3-putter';

/**
 * Select the PDF archive backend from config (ADR-0031): the filesystem store
 * by default, or S3-compatible object storage when `PDF_ARCHIVE=s3`. Fails fast
 * on `s3` without a bucket so a misconfigured deploy stops at container build,
 * not on the first archived PDF.
 */
export function createPdfArchive(deps: { config: AppConfig }): PdfArchive {
  const { config } = deps;
  if (config.pdfArchive.provider === 's3') {
    const s3 = config.pdfArchive.s3;
    if (!s3.bucket) {
      throw new Error('PDF_ARCHIVE=s3 requires S3_BUCKET to be set.');
    }
    return new S3PdfArchive({ putter: new AwsS3Putter(s3), prefix: s3.prefix });
  }
  return new FsPdfArchive({ config });
}
