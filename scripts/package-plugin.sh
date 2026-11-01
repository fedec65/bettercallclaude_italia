#!/bin/bash
set -euo pipefail

# Package BetterCallClaude Italia for distribution
# Creates a zip ready for Cowork Desktop marketplace upload

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$REPO_ROOT/dist"
PLUGIN_DIR="$REPO_ROOT/bettercallclaude_italia"
VERSION=$(node -p "require('$REPO_ROOT/package.json').version")

mkdir -p "$DIST_DIR"

echo "📦 Packaging BetterCallClaude Italia v$VERSION..."

# Validate first
echo "  🔍 Running validation..."
node "$REPO_ROOT/scripts/validate-plugin.js"

# Create temp staging directory
STAGING=$(mktemp -d)
trap "rm -rf $STAGING" EXIT

# Copy plugin files, excluding build/dev artifacts that must never ship:
# node_modules are build-only deps (the distributed server is the compiled
# bundle dist/index.js); .DS_Store/__pycache__ are local junk. They used to
# bloat the zip to ~32MB (node_modules alone was 84% of the payload).
STAGING_PLUGIN="$STAGING/bettercallclaude_italia"
mkdir -p "$STAGING_PLUGIN"
(cd "$PLUGIN_DIR" && tar cf - --exclude='node_modules' --exclude='.DS_Store' --exclude='__pycache__' --exclude='*.pyc' .) | (cd "$STAGING_PLUGIN" && tar xf -)

# Create the zip
OUTPUT="$DIST_DIR/bettercallclaude_italia-v${VERSION}.zip"
(cd "$STAGING" && zip -r -X "$OUTPUT" bettercallclaude_italia)

echo ""
echo "✅ Package created: $OUTPUT"
echo "   Size: $(du -h "$OUTPUT" | cut -f1)"
echo ""
echo "Ready for Cowork Desktop marketplace upload."
