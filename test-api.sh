#!/bin/bash

# Test 1: Valid request with API key
echo "Test 1: Sending valid request..."
curl -X POST https://newsdeck-ket27oveqq-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: ON/pBHKq/rAvFLdFP8riSarzITiR6aAY5vGyT7VeVw8=" \
  -d '{"items":[{"id":"test-log-2","title":"Test efter deploy","source":"test","timestamp":"2025-10-05T12:30:00Z","newsValue":4}],"events":{"workflowId":"test-workflow"}}'

echo -e "\n\n"

# Test 2: Request without API key (should fail and be logged)
echo "Test 2: Sending request without API key (should fail)..."
curl -X POST https://newsdeck-ket27oveqq-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

echo -e "\n\n"

# Test 3: Invalid JSON (should fail and be logged)
echo "Test 3: Sending invalid JSON..."
curl -X POST https://newsdeck-ket27oveqq-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: ON/pBHKq/rAvFLdFP8riSarzITiR6aAY5vGyT7VeVw8=" \
  -d 'invalid json here'

echo -e "\n\nDone! Check https://newsdeck-ket27oveqq-ew.a.run.app/admin/api-logs"
