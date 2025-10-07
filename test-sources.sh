#!/bin/bash

# Usage: API_KEY=your-key ./test-sources.sh
# Or set API_KEY in your .env file and run: source .env && ./test-sources.sh

if [ -z "$API_KEY" ]; then
  echo "Error: API_KEY environment variable is not set"
  echo "Usage: API_KEY=your-key ./test-sources.sh"
  exit 1
fi

echo "Sending items from different sources..."

# Expressen
curl -s -X POST https://newsdeck-ket27oveqq-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"items":[{"title":"Expressennyheter","source":"https://www.expressen.se/nyheter/artikel","timestamp":"2025-10-06T20:00:00Z","newsValue":4}],"events":{"workflowId":"test-workflow"}}'

echo ""

# DN
curl -s -X POST https://newsdeck-ket27oveqq-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"items":[{"title":"DN-nyheter","source":"https://www.dn.se/nyheter/artikel","timestamp":"2025-10-06T20:01:00Z","newsValue":3}],"events":{"workflowId":"test-workflow"}}'

echo ""

# Aftonbladet
curl -s -X POST https://newsdeck-ket27oveqq-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"items":[{"title":"Aftonbladet-nyheter","source":"https://www.aftonbladet.se/nyheter/artikel","timestamp":"2025-10-06T20:02:00Z","newsValue":5}],"events":{"workflowId":"test-workflow"}}'

echo -e "\n\nDone! Check your dashboard to see source filters."
