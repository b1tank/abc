#!/bin/bash
# Deploy ABC Balloon to YummyJars public platform
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/.env.public"
export YUMMYJARS_KEY

SLUG="abc"
TARGET="${YUMMYJARS_URL:-https://yummyjars.com}"

echo "📦 Deploying $SLUG to $TARGET..."
cd "$(dirname "$0")/public"
tar czf - . | curl -sSf -X POST \
  -H "X-API-Key: ${YUMMYJARS_KEY:?YUMMYJARS_KEY not set}" \
  -H "Content-Type: application/gzip" \
  --data-binary @- \
  "$TARGET/api/deploy/$SLUG"

echo ""
echo "✅ Deployed to $TARGET/$SLUG/"
