# ADR-0052 — One render source for the CV/cover-letter editor preview and the PDF

- **Status:** Accepted
- **Relates to:** ADR-0001 (hexagonal core), ADR-0019 (dossier assembly), ADR-0051 (NestJS HTTP layer)

## Context

The document editor promised WYSIWYG: a recruiter edits a talent's résumé and
cover letter on the left and sees a "Live preview" on the right, then exports a
PDF. In practice the preview and the PDF were **two independent implementations**
of the same document:

- the preview was a bespoke React component (`EditorDocs.jsx`) — a two-column
  layout with a dark sidebar (contact + skills on the left), timeline dots and
  **English** section labels;
- the PDF was a separate server HTML template (`domain/documents-html.ts`) — a
  single-column A4 sheet with the contact as an underline bar and **German**
  headings (`Werdegang`/`Ausbildung`/`Kompetenzen`).

Same data, two different documents: different columns, margins, line breaks and
even heading language. What the recruiter reviewed was never what the client
received — the core trust promise of the feature was broken, and the editor's
Style controls (Classic/Modern/Compact, accent, font, size) didn't drive the
export at all.

## Decision

Make `domain/documents-html.ts` the **single source of truth** for the document,
and have the editor's live preview render **that exact HTML** — the same string
the PDF is built from — instead of a parallel React tree.

- **Server:** `DocumentService.renderPdf` already runs `documentsToHtml(...)`
  through Puppeteer. Add `DocumentService.renderPreviewHtml(input)` that returns
  the identical `documentsToHtml(...)` output for arbitrary (possibly unsaved)
  editor content, and expose it as `POST /api/v1/talents/:id/documents/preview`
  (auth-guarded, persists nothing).
- **Client:** the editor's preview pane becomes an `<iframe>` whose `srcdoc` is
  the server-rendered HTML, fetched (debounced) on every content/style change and
  scaled to fit. The bespoke `EdResumeDoc`/`EdLetterDoc` preview and the
  approximate page-break markers are retired.
- **Print/screen parity without divergence:** the PDF is still driven solely by
  the `@page` rules (Puppeteer `preferCSSPageSize`), so the exported bytes are
  **unchanged**. A `@media screen` block — ignored in print — gives the iframe an
  A4 sheet with the same content width and margins, so preview line breaks match
  the page. Section headings move to English (matching the English product) and
  the two pages carry `id="doc-resume"`/`id="doc-letter"` anchors the toggle
  scrolls to.

## Consequences

- **WYSIWYG holds by construction.** Preview and export can't drift: a service
  test asserts the preview HTML is byte-identical to the HTML the PDF is built
  from, and a browser test asserts the editor renders the server HTML in an
  iframe and re-fetches when the style changes.
- The preview now costs a debounced server round-trip per edit (the editor
  already autosaves over the network, so this fits the existing model); a failed
  render keeps the last good preview.
- Style presets finally affect the real output, since they feed the one template.
- **Trade-off:** the visual identity moves to the single-column A4 look. The
  richer two-column design can return later — but only as the one shared
  template, never as a second preview-only renderer.
