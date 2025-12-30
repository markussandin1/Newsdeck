#!/bin/bash

# Smart Development Startup Script
#
# Automatically starts Cloud SQL Proxy if not running, then starts Next.js dev server.
# This provides a seamless "just works" development experience.

echo "🔍 Checking Cloud SQL Proxy status..."

# Check if proxy is running
PROXY_CHECK=$(ps aux | grep "cloud-sql-proxy.*newsdeck" | grep -v grep)

if [ -z "$PROXY_CHECK" ]; then
  echo ""
  echo "⚠️  Cloud SQL Proxy is not running"
  echo "🚀 Starting Cloud SQL Proxy in background..."
  echo ""

  # Start proxy in background
  cloud-sql-proxy newsdeck-473620:europe-west1:newsdeck-db --port 5432 > /tmp/cloud-sql-proxy-newsdeck.log 2>&1 &
  PROXY_PID=$!

  # Wait for proxy to start
  sleep 3

  # Verify it started successfully
  if ps -p $PROXY_PID > /dev/null 2>&1; then
    echo "✅ Cloud SQL Proxy started successfully (PID: $PROXY_PID)"
    echo "📝 Logs: /tmp/cloud-sql-proxy-newsdeck.log"
  else
    echo "❌ Failed to start Cloud SQL Proxy"
    echo ""
    echo "Check that you're authenticated with GCP:"
    echo "  gcloud auth application-default login"
    echo ""
    exit 1
  fi
else
  echo "✅ Cloud SQL Proxy is already running"
fi

echo ""
echo "🚀 Starting Next.js development server..."
echo ""

# Start Next.js dev server
npm run dev
