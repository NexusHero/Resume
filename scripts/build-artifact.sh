#!/usr/bin/env bash
# Build a downloadable, runnable artifact of the suite.
#
# Baseline: a versioned bundle with the compiled TypeScript server (core/dist)
# the user unpacks and runs with `npm ci --omit=dev && npm start`.
# PR4 will upgrade this to a single self-contained executable (@yao-pkg/pkg).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
OSNAME="$(uname -s | tr '[:upper:]' '[:lower:]')"
OUT="dist"
NAME="resume-suite-v${VERSION}-${OSNAME}"

# Compile the TypeScript server so the artifact runs without dev tooling.
npm run build

rm -rf "$OUT/$NAME"
mkdir -p "$OUT/$NAME/core"

# Ship the compiled server + the static web app + the CLI tools.
cp -R core/dist "$OUT/$NAME/core/dist"
cp core/openapi.yaml "$OUT/$NAME/core/" 2>/dev/null || true
cp -R tools myjob ui_kits components tokens assets vendor styles.css index.html \
      package.json package-lock.json README.md LICENSE "$OUT/$NAME/" 2>/dev/null || true

cat > "$OUT/$NAME/RUN.md" <<'EOF'
# Run the Résumé / myJob suite

```bash
npm ci --omit=dev
npm start
```

Then open http://localhost:4178/ — the REST API is under /api/v1.
EOF

( cd "$OUT" && tar -czf "${NAME}.tar.gz" "$NAME" && rm -rf "$NAME" )
echo "✓ built $OUT/${NAME}.tar.gz"
