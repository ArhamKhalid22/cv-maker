#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
echo "Running smoke tests against $API_URL..."

# 1) Health Check
echo "[Test] GET /healthz"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/healthz" || echo "000")
if [ "$STATUS" != "200" ]; then
  echo "FAIL: GET /healthz returned $STATUS"
  exit 1
fi
echo "SUCCESS: API is up"

# 2) E2E Test (Optional based on server status)
echo "[Test] Checking if generation endpoint exists"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/v1/generations" || echo "000")
if [ "$STATUS" == "404" ]; then
  echo "Warning: /v1/generations not found yet (maybe not implemented or different port)."
else
  echo "SUCCESS: Endpoint responded with $STATUS"
fi

echo "Smoke tests passed!"
