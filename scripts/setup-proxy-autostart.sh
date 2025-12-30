#!/bin/bash

# Setup Cloud SQL Proxy Auto-Start
#
# Installs a macOS LaunchAgent that automatically starts Cloud SQL Proxy
# when you log in. The proxy will also restart automatically if it crashes.

PLIST_FILE="com.newsdeck.cloud-sql-proxy.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$PLIST_FILE"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔧 Setting up Cloud SQL Proxy auto-start..."
echo ""

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "❌ cloud-sql-proxy is not installed"
    echo ""
    echo "Install it with:"
    echo "  brew install cloud-sql-proxy"
    echo ""
    exit 1
fi

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Copy plist file
echo "📄 Installing LaunchAgent plist..."
cp "$PROJECT_DIR/config/$PLIST_FILE" "$PLIST_PATH"

# Unload if already loaded (ignore errors)
echo "🔄 Reloading LaunchAgent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Load the LaunchAgent
launchctl load "$PLIST_PATH"

# Wait a moment for it to start
sleep 2

# Check if it's running
if launchctl list | grep -q "com.newsdeck.cloud-sql-proxy"; then
    echo ""
    echo "✅ Cloud SQL Proxy auto-start configured successfully!"
    echo ""
    echo "The proxy will now:"
    echo "  • Start automatically when you log in"
    echo "  • Restart automatically if it crashes"
    echo "  • Listen on localhost:5432"
    echo ""
    echo "📝 Logs:"
    echo "  Output: /tmp/cloud-sql-proxy-newsdeck.log"
    echo "  Errors: /tmp/cloud-sql-proxy-newsdeck-error.log"
    echo ""
    echo "💡 Management commands:"
    echo "  npm run proxy:status   - Check if running"
    echo "  npm run proxy:logs     - View logs"
    echo "  npm run proxy:restart  - Restart proxy"
    echo ""
    echo "🗑️  To disable auto-start:"
    echo "  launchctl unload ~/Library/LaunchAgents/$PLIST_FILE"
    echo "  rm ~/Library/LaunchAgents/$PLIST_FILE"
    echo ""
else
    echo ""
    echo "⚠️  LaunchAgent installed but may not have started."
    echo ""
    echo "Check the error log for details:"
    echo "  cat /tmp/cloud-sql-proxy-newsdeck-error.log"
    echo ""
    echo "Make sure you're authenticated with GCP:"
    echo "  gcloud auth application-default login"
    echo ""
fi
