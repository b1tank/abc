#!/bin/bash
# Deploy ABC Balloon to YummyJars LAN platform
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/.env.lan"
export YUMMYJARS_KEY

SLUG="abc"
TARGET="${YUMMYJARS_LAN_URL:-https://my.yummyjars.com}"

echo "📦 Deploying $SLUG to $TARGET..."
cd "$(dirname "$0")/public"
tar czf - . | curl -sSf -X POST \
  -H "X-API-Key: ${YUMMYJARS_KEY:?YUMMYJARS_KEY not set}" \
  -H "Content-Type: application/gzip" \
  --data-binary @- \
  "$TARGET/api/deploy/$SLUG"

echo ""
echo "✅ Deployed to $TARGET/$SLUG/"
