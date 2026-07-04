import { S3PdfArchive, type ObjectPutter } from '../../src/adapters/s3-pdf-archive.js';
import { createPdfArchive } from '../../src/adapters/create-pdf-archive.js';
import { FsPdfArchive } from '../../src/adapters/fs-pdf-archive.js';
import { loadConfig } from '../../src/config.js';

function recordingPutter() {
  const calls: { key: string; body: Buffer; contentType: string }[] = [];
  const putter: ObjectPutter = {
    async put(key, body, contentType) {
      calls.push({ key, body, contentType });
    },
  };
  return { putter, calls };
}

describe('S3PdfArchive', () => {
  it('Save_WithPrefix_PutsAtPrefixedKeyAsPdfAndReturnsIt', async () => {
    const { putter, calls } = recordingPutter();
    const archive = new S3PdfArchive({ putter, prefix: 'pdf-archive' });

    const key = await archive.save('2026-01-01_helio_abc', Buffer.from('%PDF'));

    expect(key).toBe('pdf-archive/2026-01-01_helio_abc.pdf');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ key, contentType: 'application/pdf' });
    expect(calls[0].body.toString()).toBe('%PDF');
  });

  it('Save_EmptyPrefix_PutsAtBareKey', async () => {
    const { putter } = recordingPutter();
    const archive = new S3PdfArchive({ putter });
    expect(await archive.save('foo', Buffer.from('x'))).toBe('foo.pdf');
  });

  it('Save_PrefixWithSlashes_IsNormalised', async () => {
    const { putter } = recordingPutter();
    const archive = new S3PdfArchive({ putter, prefix: '/nested/dir/' });
    expect(await archive.save('foo', Buffer.from('x'))).toBe('nested/dir/foo.pdf');
  });
});

describe('createPdfArchive', () => {
  it('Factory_DefaultConfig_BuildsFilesystemArchive', () => {
    expect(createPdfArchive({ config: loadConfig({}) })).toBeInstanceOf(FsPdfArchive);
  });

  it('Factory_S3WithBucket_BuildsS3Archive', () => {
    const config = loadConfig({ PDF_ARCHIVE: 's3', S3_BUCKET: 'my-bucket' });
    expect(createPdfArchive({ config })).toBeInstanceOf(S3PdfArchive);
  });

  it('Factory_S3WithoutBucket_ThrowsFailFast', () => {
    const config = loadConfig({ PDF_ARCHIVE: 's3' });
    expect(() => createPdfArchive({ config })).toThrow(/S3_BUCKET/);
  });
});
