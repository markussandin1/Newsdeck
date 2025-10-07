#!/bin/bash

# Usage: API_KEY=your-key ./test-coords.sh
# Or set API_KEY in your .env file and run: source .env && ./test-coords.sh

if [ -z "$API_KEY" ]; then
  echo "Error: API_KEY environment variable is not set"
  echo "Usage: API_KEY=your-key ./test-coords.sh"
  exit 1
fi

echo "Testing coordinate normalization..."
curl -s -X POST https://newsdeck-ket27oveqq-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"items":[{"id":"coord-test","title":"Test koordinater","source":"test","timestamp":"2025-10-06T20:00:00Z","newsValue":3,"location":{"coordinates":["64.1333, 17.7167"]}}],"events":{"workflowId":"test-workflow"}}' | jq '.insertedItems[0].location'
