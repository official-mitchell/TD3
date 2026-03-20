#!/usr/bin/env bash
# 15.4 Smoke test checklist — run with: ./scripts/smoke-test.sh https://your-app.onrender.com
# Requires: RENDER_URL as first argument

set -e
RENDER_URL="${1:?Usage: $0 <RENDER_URL>}"

echo "=== 15.4 Smoke Test Checklist ==="
echo "RENDER_URL: $RENDER_URL"
echo ""

echo "15.4.1 GET /api/platform/status — valid JSON, not 502/503"
STATUS=$(curl -s -o /tmp/platform-status.json -w "%{http_code}" "$RENDER_URL/api/platform/status")
if [ "$STATUS" = "502" ] || [ "$STATUS" = "503" ]; then
  echo "  FAIL: Got $STATUS"
  cat /tmp/platform-status.json 2>/dev/null || true
  exit 1
fi
if [ "$STATUS" = "404" ]; then
  echo "  NOTE: 404 — platform not initialized. Run POST /api/platform/init first."
  echo "  Response: $(cat /tmp/platform-status.json)"
else
  echo "  OK: HTTP $STATUS"
  head -c 200 /tmp/platform-status.json
  echo "..."
fi
echo ""

echo "15.4.4 POST /api/drones/test-types — spawn drones"
INIT_STATUS=$(curl -s -o /tmp/platform-init.json -w "%{http_code}" -X POST "$RENDER_URL/api/platform/init" 2>/dev/null || echo "000")
if [ "$INIT_STATUS" = "200" ]; then
  echo "  Platform initialized (was not present)."
fi
TEST_RESULT=$(curl -s -o /tmp/test-types.json -w "%{http_code}" -X POST "$RENDER_URL/api/drones/test-types")
if [ "$TEST_RESULT" = "200" ]; then
  echo "  OK: HTTP 200"
  cat /tmp/test-types.json | head -c 300
  echo "..."
else
  echo "  FAIL: HTTP $TEST_RESULT"
  cat /tmp/test-types.json 2>/dev/null || true
fi
echo ""

echo "=== API checks complete ==="
echo ""
echo "Manual checks (open Vercel URL in browser):"
echo "  15.4.2  Vercel URL loads, no console errors"
echo "  15.4.3  Connection badge → CONNECTED within 10s"
echo "  15.4.5  Drone icons on map within 5s"
echo "  15.4.6  Selecting drone populates detail panel"
echo "  15.4.7  Drone reaches Engagement Ready in ~2min, FIRE activates"
echo "  15.4.8  FIRE triggers result in engagement log"
echo "  15.4.9  PWA install prompt, fullscreen works"
echo "  15.4.10 Airplane mode → offline banner, last-known state visible"
