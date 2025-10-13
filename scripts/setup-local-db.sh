#!/bin/bash

# NewsDeck Local Database Setup Script
# This script sets up a local PostgreSQL database using Docker

set -e

echo "🚀 Setting up NewsDeck local database..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env.local exists, if not create from .env.example
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo "✅ .env.local created"
  echo ""
  echo "⚠️  Please review .env.local and update if needed"
  echo ""
fi

# Start PostgreSQL with Docker Compose
echo "🐘 Starting PostgreSQL container..."
docker-compose up -d postgres

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is healthy
max_attempts=30
attempt=0
while ! docker exec newsdeck-postgres pg_isready -U newsdeck > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ PostgreSQL failed to start after $max_attempts attempts"
    exit 1
  fi
  echo "   Waiting... ($attempt/$max_attempts)"
  sleep 1
done

echo ""
echo "✅ PostgreSQL is ready!"
echo ""
echo "📊 Database connection details:"
echo "   Host: localhost"
echo "   Port: 5433"
echo "   Database: newsdeck_dev"
echo "   User: newsdeck"
echo "   Password: newsdeck_local"
echo ""
echo "   Connection string:"
echo "   postgresql://newsdeck:newsdeck_local@localhost:5433/newsdeck_dev"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Open http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  - Stop database: docker-compose down"
echo "  - View logs: docker-compose logs -f postgres"
echo "  - Connect to database: docker exec -it newsdeck-postgres psql -U newsdeck -d newsdeck_dev"
echo "  - Reset database: docker-compose down -v && ./scripts/setup-local-db.sh"
echo ""
