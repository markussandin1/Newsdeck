#!/bin/bash

# Test script for verifying MainDashboard refactoring
# Sends a test event to the API to verify long-polling and real-time updates

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load API_KEY from .env.local if not already set
if [ -z "$API_KEY" ]; then
  if [ -f .env.local ]; then
    # Use -f2- to get everything after first =, including any = in the key itself
    export API_KEY=$(grep '^API_KEY=' .env.local | cut -d '=' -f2-)
  fi
fi

if [ -z "$API_KEY" ]; then
  echo -e "${RED}Error: API_KEY not found in environment or .env.local${NC}"
  exit 1
fi

echo -e "${BLUE}Sending test event to NewsDeck API...${NC}"

curl -X POST http://localhost:3002/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{
    "columnId": "col-traffic-4c1f05f8-ce07-43de-b908-018ef0d9827c",
    "items": [{
      "id": "test-'"$(date +%s)"'",
      "title": "TEST: Refaktoreringstest '"$(date +%H:%M:%S)"'",
      "description": "Testar att long-polling fungerar efter refaktorering",
      "source": "test",
      "newsValue": 5,
      "category": "test",
      "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
    }]
  }'

echo -e "\n${GREEN}Test event sent!${NC}"
echo -e "${BLUE}Check your dashboard for the new item.${NC}"
