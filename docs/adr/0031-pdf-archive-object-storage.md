# ADR-0031 — PDF archive to S3-compatible object storage

- **Status:** Accepted (D-series, slice 3)
- **Relates to:** ADR-0003 (fs default / Postgres opt-in), ADR-0029/0030 (production readiness + horizontal scale)

## Context

After ADR-0029/0030 (Postgres mandatory, scheduler leader-elected) the app tier
is stateless and horizontally scalable — with one exception the runbook already
called out: the **PDF archive** is still written to the local filesystem
(`FsPdfArchive`, under `/app/archive`). That ties archived application PDFs to a
single machine's disk: they're lost on redeploy without a mounted volume, and
two instances don't share them. It is the last file-backed store.

The archive is **write-only** from the app's perspective — `PdfArchive.save`
returns a path that is recorded on the application row and echoed in the
response, but nothing serves the archived PDF back by that path (talent
documents and dossiers are generated on demand). So moving it needs no retrieval
path, only a durable place to write.

## Decision

Put an S3-compatible object store behind the existing `PdfArchive` port,
selected by config — the same factory pattern as the store (ADR-0003) and the
embedding backends (ADR-0020):

- **`createPdfArchive(config)`** returns `FsPdfArchive` by default, or
  `S3PdfArchive` when `PDF_ARCHIVE=s3`. It **fails fast** if `s3` is set without a
  bucket, so a misconfiguration stops at container build, not on the first PDF.
- **`S3PdfArchive`** holds the pure logic (prefix-normalised key derivation, the
  `application/pdf` PUT) and depends on a tiny `ObjectPutter` interface, so it is
  fully unit-tested with a fake — no SDK in the test path.
- **`AwsS3Putter`** is the real `ObjectPutter` over `@aws-sdk/client-s3`. A
  configurable `endpoint` + `forcePathStyle` means the same adapter serves AWS
  S3, Cloudflare R2, Hetzner Object Storage and MinIO — the EU-hosting options
  matter for the DSGVO story. Credentials come from config when given, else the
  SDK's default chain. It is real network I/O, so it is excluded from coverage
  (like the Puppeteer renderer and SMTP mailer) and exercised in deployment.

## Consequences

- The PDF archive is no longer bound to a machine: with `PDF_ARCHIVE=s3` it
  survives redeploys and is shared across instances, closing the last "file on
  local disk" gap for a scaled deployment. The filesystem archive stays the
  zero-config default for local/dev and single-box installs.
- The change is behaviour-neutral for existing deployments — `fs` is still the
  default and `FsPdfArchive` is untouched; only the wiring moved to a factory.
- Covered by unit tests (S3 key derivation + prefix normalisation via a fake
  putter; factory fs/s3 selection and the fail-fast on a missing bucket). The
  real S3 round-trip is a deployment-time check against a real bucket.
- Retrieval/serving of archived PDFs and lifecycle (retention/expiry on the
  bucket) are out of scope — the archive remains a write-only durable record.
