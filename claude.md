# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NewsDeck is a real-time news dashboard system that receives news events from AI-driven workflow agents via API and displays them on customizable dashboards. The system is designed to be simple, with no user authentication—all dashboards are public and real-time updates are delivered via Google Cloud Pub/Sub and long-polling.

### Workflows Integration

NewsDeck is fed data by **Workflows** (https://workflows-lab-iap.bnu.bn.nr/workflows), a separate application where users build automated flows using AI agents as building blocks. These workflows monitor various data sources (news APIs, government feeds, social media, etc.) and process events through AI agents that:
- Extract relevant information
- Classify news value (1-5)
- Determine geographic location
- Generate summaries and descriptions

Each workflow is assigned a unique `workflowId` (e.g., "workflow-breaking-news", "workflow-traffic-incidents"). When a workflow detects newsworthy events, it POSTs them to NewsDeck's `/api/workflows` endpoint with either:
- **`workflowId`**: NewsDeck automatically routes events to ALL dashboard columns where `column.flowId === workflowId` (many-to-many relationship)
- **`columnId`**: Direct routing to a specific column (one-to-one relationship)

This dual routing mechanism enables both broad distribution (one workflow → multiple dashboards) and precise targeting (workflow → specific column).

## Technology Stack

- **Framework:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (Cloud SQL in production, Docker locally)
- **Real-time:** Google Cloud Pub/Sub + long-polling fallback
- **Authentication:** NextAuth v5 (optional, for admin features only)
- **Deployment:** Google Cloud Run (europe-west1)
- **CI/CD:** GitHub Actions with Workload Identity Federation

## Development Commands

### Local Development
```bash
# Start development server (requires DATABASE_URL)
npm run dev

# Type checking (run before commits)
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Run tests
npm test
```

### Database Management (Local Docker PostgreSQL)
```bash
# Initial setup: Create Docker container and run migrations
npm run db:setup

# Start PostgreSQL container
npm run db:start

# Stop PostgreSQL container
npm run db:stop

# Reset database (removes all data)
npm run db:reset

# View database logs
npm run db:logs

# Connect to PostgreSQL CLI
npm run db:connect
```

**Local Database Connection:**
```
Host: localhost
Port: 5432
User: newsdeck-user
Password: [see docker-compose.yml]
Database: newsdeck
```

## Architecture Overview

### Data Flow: Workflow → Dashboard

1. **Ingestion** (`/api/workflows`)
   - External workflow agents POST news items with `workflowId` or `columnId`
   - Items validated and stored in `news_items` table with auto-generated `db_id` (UUID)
   - System matches items to dashboard columns by comparing `workflowId` to `column.flowId`
   - Matched items added to `column_data` table (junction table)
   - Events published to Pub/Sub and local event queue

2. **Storage** (`lib/db-postgresql.ts`)
   - **`news_items`**: Master table for all news events (indexed by `db_id`)
   - **`column_data`**: Junction table linking columns to news items (composite key: `column_id` + `news_item_db_id`)
   - **`dashboards`**: Dashboard configuration (stored as JSONB including columns array)

3. **Real-time Updates**
   - **Primary:** Google Cloud Pub/Sub pushes events to `/api/pubsub/push` endpoint
   - **Fallback:** Long-polling via `/api/columns/[id]/updates` (dev environment + backup)
   - Frontend (`MainDashboard.tsx`) subscribes to updates and deduplicates by `dbId`

4. **Rendering** (`MainDashboard.tsx`)
   - Initial load: Fetch all column data via `/api/dashboards/[slug]`
   - Real-time: Long-polling continuously checks for new items per column
   - Deduplication: Items filtered by `dbId` to prevent duplicates in UI
   - Visual priority: newsValue 5 = red + pulsing, 4 = orange, 3 = yellow, 1-2 = gray

### Key Matching Logic

**Column-to-Workflow Matching:**
```typescript
// In lib/services/ingestion.ts

// Option 1: Direct column targeting
{
  "columnId": "col-breaking-d1a97...",
  "items": [...]
}
// Result: Items added ONLY to specified column

// Option 2: Workflow-based routing (many-to-many)
{
  "workflowId": "workflow-abc",
  "items": [...]
}
// System searches ALL dashboards for columns where:
column.flowId === workflowId  // Match!
// Result: Items added to ALL matching columns across all dashboards
```

**Deduplication in Frontend:**
```typescript
// In MainDashboard.tsx long-polling
const newItems = data.items.filter(
  (newItem) => !existingItems.some(existing =>
    existing.dbId === newItem.dbId  // Compare database-generated UUID
  )
)
```

## Database Schema (PostgreSQL)

### Core Tables
```sql
-- Master news items table
CREATE TABLE news_items (
  db_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT,              -- Optional ID from source system
  workflow_id TEXT NOT NULL,   -- Workflow that created this item
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  news_value INTEGER NOT NULL CHECK (news_value BETWEEN 1 AND 5),
  category TEXT,
  severity TEXT,
  location JSONB,
  extra JSONB,
  raw JSONB,
  created_in_db TIMESTAMPTZ DEFAULT NOW()
);

-- Column-to-news-item junction table
CREATE TABLE column_data (
  column_id TEXT NOT NULL,
  news_item_db_id UUID NOT NULL REFERENCES news_items(db_id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (column_id, news_item_db_id)
);

-- Dashboards (columns stored as JSONB array)
CREATE TABLE dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  columns JSONB NOT NULL DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0
);
```

### Important Column Structure
```typescript
interface DashboardColumn {
  id: string;           // e.g., "col-breaking-d1a97..."
  title: string;
  description?: string;
  flowId?: string;      // Matches against incoming workflowId
  isArchived?: boolean;
  archivedAt?: string;
}
```

## API Endpoints

### Public Endpoints (API Key Required)
- `POST /api/workflows` - Ingest news items from workflow agents
- `GET /api/status` - Health check

### Protected Endpoints (Session Auth)
- `GET /api/dashboards` - List all dashboards
- `GET /api/dashboards/[slug]` - Get dashboard + column data
- `PUT /api/dashboards/[slug]` - Update dashboard config
- `POST /api/columns/[id]` - Update column settings
- `DELETE /api/columns/[id]` - Clear column data
- `GET /api/columns/[id]/updates?lastSeen=[timestamp]` - Long-polling for new items

### Pub/Sub Endpoints (No Auth)
- `POST /api/pubsub/push` - Receive Pub/Sub push notifications

## Deployment (Google Cloud Platform)

### Infrastructure
- **Project ID:** `newsdeck-473620`
- **Region:** `europe-west1`
- **Service:** Cloud Run (`newsdeck`)
- **Database:** Cloud SQL PostgreSQL (private IP)
- **Real-time:** Pub/Sub topic `newsdeck-news-updates`
- **Registry:** Artifact Registry (`cloud-run-source-deploy`)

### Deployment Process
1. Push to `main` branch triggers CI workflow (`.github/workflows/ci.yml`)
2. CI runs: `npm run type-check`, `npm run lint`, `npm test`
3. On CI success, deploy workflow (`.github/workflows/deploy.yml`) triggers:
   - Authenticate via Workload Identity Federation
   - Build Docker image (multi-stage build from `Dockerfile`)
   - Push to Artifact Registry
   - Deploy to Cloud Run with latest image
4. Cloud Run automatically handles traffic shifting

### Required Environment Variables (Production)
```bash
# In Cloud Run service configuration:
DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance
NEXTAUTH_URL=https://newsdeck-xxxxxx-ew.a.run.app
NEXTAUTH_SECRET=[generated secret]
API_KEY=[workflow auth key]
GOOGLE_PROJECT_ID=newsdeck-473620
PUBSUB_TOPIC=newsdeck-news-updates
```

### Manual Deployment Commands
```bash
# Authenticate
gcloud auth login
gcloud config set project newsdeck-473620

# Build and deploy
gcloud run deploy newsdeck \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=newsdeck" --limit 50

# Describe service
gcloud run services describe newsdeck --region europe-west1
```

## Project Structure

```
/app
  /api
    /workflows/route.ts        # Main ingestion endpoint
    /dashboards/[slug]/route.ts # Dashboard CRUD
    /columns/[id]/route.ts     # Column management
    /pubsub/push/route.ts      # Pub/Sub receiver
  /dashboard/[slug]/page.tsx   # Dashboard view
  /admin/page.tsx              # Admin interface

/lib
  /db-postgresql.ts            # PostgreSQL adapter (main DB layer)
  /db-config.ts                # DB instance selector
  /services/ingestion.ts       # Workflow ingestion logic
  /pubsub.ts                   # Google Cloud Pub/Sub client
  /event-queue.ts              # In-memory event queue (dev fallback)
  /api-auth.ts                 # API key verification
  /types.ts                    # TypeScript interfaces

/components
  /MainDashboard.tsx           # Main dashboard UI (⚠️ large file, 2000+ lines)
  /NewsItem.tsx                # Individual news item card
  /NewsItemModal.tsx           # Detail view modal

/migrations                    # SQL migration files
/scripts                       # Setup scripts (db setup, etc.)
```

## Important Implementation Notes

### MainDashboard.tsx Complexity
- **Size:** 2000+ lines, handles all dashboard UI logic
- **Responsibilities:** Layout, real-time updates, long-polling, drag & drop, modals, mobile UI
- **Refactoring Plan:** See inline comments for planned breakdown into:
  - Custom hooks: `useDashboardData`, `useDashboardPolling`, `useColumnNotifications`, `useDashboardLayout`
  - Presentational components: `DashboardHeader`, `ColumnBoard`, `DashboardModals`
- **Current State:** Functional but monolithic—refactor carefully with incremental testing

### Real-time Update Strategy
1. **Pub/Sub (Production):** Google Cloud Pub/Sub pushes events to `/api/pubsub/push`
2. **Long-polling (Dev + Fallback):** Frontend polls `/api/columns/[id]/updates` every ~30s
3. **Event Queue (Dev):** In-memory queue for immediate local delivery
4. **Deduplication:** All three paths converge on same `dbId`-based deduplication in frontend

### Audio Notifications
- Stored in localStorage: `audioEnabled` (true/false/null)
- Per-column mute settings: `mutedColumns_{dashboardId}` in localStorage
- Browser autoplay policy requires user interaction on first visit

## Common Development Tasks

### Adding a New API Endpoint
1. Create `/app/api/your-endpoint/route.ts`
2. Export `GET`, `POST`, etc. as async functions
3. Use `verifyApiKey()` or `verifySession()` for auth
4. Return `NextResponse.json()` responses
5. Add logging via `logger.info/warn/error`

### Adding a Database Migration
1. Create `migrations/XXX-description.sql`
2. Run manually: `psql -h localhost -U newsdeck-user -d newsdeck -f migrations/XXX-description.sql`
3. Update schema in `lib/db-postgresql.ts` if needed
4. Test locally with `npm run db:reset` before deploying

### Testing Real-time Updates Locally
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2a: Send test event with workflowId (many-to-many routing)
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{
    "workflowId": "test-workflow",
    "items": [{
      "id": "sos-12345",
      "title": "Brand i flerfamiljshus, Sundsvall",
      "description": "Räddningstjänst på plats med flera enheter",
      "source": "sos",
      "newsValue": 5,
      "category": "emergency",
      "severity": "high",
      "timestamp": "2025-10-14T10:00:00Z",
      "location": {
        "municipality": "Sundsvall",
        "county": "Västernorrlands län",
        "name": "Storgatan 45",
        "coordinates": [62.3908, 17.3069]
      }
    }]
  }'
# → Event appears in ALL columns with flowId: "test-workflow"

# Terminal 2b: Send test event with columnId (direct routing)
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{
    "columnId": "col-breaking-d1a97dfa-32f1-4d6c-9e00-7c11ec6a3704",
    "items": [{
      "title": "Trafikolycka E4 söderut",
      "source": "trafikverket",
      "newsValue": 3,
      "timestamp": "2025-10-14T10:05:00Z"
    }]
  }'
# → Event appears ONLY in specified column
```

## Debugging Tips

### Database Connection Issues
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npm run db:connect

# Check logs
npm run db:logs
```

### Cloud Run Issues
```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50 --format json

# Check service status
gcloud run services describe newsdeck --region europe-west1

# View revisions
gcloud run revisions list --service newsdeck --region europe-west1
```

### Long-polling Not Working
- Check browser console for `LongPoll:` log messages
- Verify column has `flowId` set and matches incoming `workflowId`
- Check `/api/columns/[id]/updates` endpoint manually
- Verify Pub/Sub topic and subscription exist in GCP

## Known Issues / Tech Debt

1. **Duplicate Events:** Same news item can be inserted multiple times with different `dbId` if workflow sends same event repeatedly. Deduplication only happens in frontend, not at database level.

2. **MainDashboard.tsx Size:** 2000+ lines, needs refactoring into smaller components and hooks.

3. **No Database Migrations System:** Migrations are manual SQL files, no automatic tracking of applied migrations.

4. **API Key Security:** Single API key in environment variable, no per-client keys or rate limiting.

5. **No Cleanup Job:** Old news items accumulate indefinitely, no automatic archival/deletion.
