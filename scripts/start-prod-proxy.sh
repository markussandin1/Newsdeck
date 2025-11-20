#!/bin/bash

# Start Cloud SQL Proxy for NewsDeck production database
# This allows local connection to the production database via localhost:5432

INSTANCE_CONNECTION_NAME="newsdeck-473620:europe-west1:newsdeck-db"

echo "🚀 Starting Cloud SQL Proxy for $INSTANCE_CONNECTION_NAME..."
echo "🔌 Listening on localhost:5434"
echo "⚠️  Make sure you have authenticated with gcloud: gcloud auth application-default login"

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "❌ cloud-sql-proxy could not be found"
    echo "Please install it: brew install cloud-sql-proxy"
    exit 1
fi

# Start the proxy
cloud-sql-proxy --port 5434 $INSTANCE_CONNECTION_NAME
