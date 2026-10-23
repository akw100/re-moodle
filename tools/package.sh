#!/bin/sh
# Builds dist/re-moodle-<version>.zip for the Chrome Web Store: only the files the extension ships.
set -e
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/re-moodle-$VERSION.zip"
mkdir -p dist && rm -f "$OUT"
zip -q -r "$OUT" manifest.json icons popup src themes -x '*.DS_Store'
echo "$OUT"
