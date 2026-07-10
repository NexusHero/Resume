#!/usr/bin/env bash
# The full local quality gate — identical to what CI runs.
# Run before opening a PR:  ./test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "▶ format:check"
npm run --silent format:check

echo "▶ lint"
npm run --silent lint

echo "▶ docs:check"
npm run --silent docs:check

echo "▶ test:web"
npm run --silent test:web

echo "▶ test"
npm run --silent test

echo "✓ all checks passed"
