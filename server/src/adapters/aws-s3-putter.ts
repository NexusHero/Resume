import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { ObjectPutter } from './s3-pdf-archive.js';
import type { PdfArchiveConfig } from '../config.js';

/**
 * Real S3 `ObjectPutter` over the AWS SDK. Talks to any S3-compatible endpoint
 * (AWS S3, Cloudflare R2, Hetzner Object Storage, MinIO) — set `endpoint` +
 * `forcePathStyle` for the non-AWS ones. Credentials come from the config when
 * given, otherwise the SDK's default provider chain (env / IAM role). Exercised
 * against a real bucket in deployment, not unit-covered — the pure key/prefix
 * logic lives in S3PdfArchive, which is.
 */
export class AwsS3Putter implements ObjectPutter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: PdfArchiveConfig['s3']) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint
        ? { endpoint: config.endpoint, forcePathStyle: config.forcePathStyle }
        : {}),
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }
}
