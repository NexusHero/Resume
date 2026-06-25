#!/usr/bin/env bash
# Build a downloadable, runnable artifact of the suite.
#
# PR1 baseline: a versioned source bundle the user unpacks and runs with
#   npm ci --omit=dev && npm run serve
# PR4 will upgrade this to a single self-contained executable (@yao-pkg/pkg).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
OSNAME="$(uname -s | tr '[:upper:]' '[:lower:]')"
OUT="dist"
NAME="resume-suite-v${VERSION}-${OSNAME}"

rm -rf "$OUT"
mkdir -p "$OUT/$NAME"

# Ship the runnable app + server, not the dev/build cruft.
cp -R tools myjob ui_kits components tokens assets vendor styles.css index.html \
      package.json package-lock.json README.md LICENSE "$OUT/$NAME/" 2>/dev/null || true

cat > "$OUT/$NAME/RUN.md" <<'EOF'
# Run the Résumé / myJob suite

```bash
npm ci --omit=dev
npm run serve
```

Then open http://localhost:4178/
EOF

( cd "$OUT" && tar -czf "${NAME}.tar.gz" "$NAME" && rm -rf "$NAME" )
echo "✓ built $OUT/${NAME}.tar.gz"
