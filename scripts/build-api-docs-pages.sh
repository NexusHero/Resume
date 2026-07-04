#!/usr/bin/env bash
# Build a static, read-only mirror of the OpenAPI reference for GitHub Pages
# (ADR-0044). Self-hosted swagger-ui-dist assets — no CDN, same reasoning as
# the in-app docs (ADR-0011/0012) — with "Try it out" disabled, since this
# mirror isn't authenticated against a running server the way /api/v1/docs is.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

OUT="${1:-dist-pages}"
ASSETS="node_modules/swagger-ui-dist"

rm -rf "$OUT"
mkdir -p "$OUT"

cp "$ASSETS/swagger-ui.css" "$OUT/"
cp "$ASSETS/swagger-ui-bundle.js" "$OUT/"
cp server/openapi.yaml "$OUT/"

cat > "$OUT/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>myJob API — Swagger UI</title>
<link rel="stylesheet" href="swagger-ui.css"/>
</head>
<body>
<div id="swagger-ui"></div>
<script src="swagger-ui-bundle.js" charset="UTF-8"></script>
<script src="swagger-initializer.js" charset="UTF-8"></script>
</body>
</html>
EOF

cat > "$OUT/swagger-initializer.js" <<'EOF'
window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: 'openapi.yaml',
    dom_id: '#swagger-ui',
    deepLinking: true,
    supportedSubmitMethods: [],
  });
};
EOF

echo "✓ built $OUT/ — static Swagger UI mirror (read-only, no CDN)"
