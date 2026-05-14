# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **newsdeck-production** repository containing a news dashboard application called **Newsdeck**. The main codebase is located in this directory. The root also contains a GCP migration plan.

Newsdeck is fed events from another application, an ai-agent system called "Workflows". That posts events to our application. Both are built in house. 

Before you comitt something you must always update this file, claude.md, not just add stuff, make sure its up to date by removing stuff that we have changed. 

## Development Commands

Navigate to the `Newsdeck/` directory for all development work:

```bash
cd Newsdeck-production/
```

### Essential Commands
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Development Workflow
1. Always run `npm run type-check` and `npm run lint` before committing changes
2. Test locally with `npm run dev`
3. Build and test production with `npm run build && npm run start`

## Local Development Setup

### Database Connection (Cloud SQL Proxy)

Local development **always uses the production database** via Cloud SQL Proxy. This allows testing frontend changes against real data without maintaining separate test datasets.

Här är steg-för-steg-listan för att starta appen lokalt mot
  produktionsdatabasen:

   1. Autentisera mot Google Cloud (Görs bara vid behov/om sessionen
      gått ut)

   1     gcloud auth application-default login
      (Detta krävs för att proxyn ska få prata med databasen)

   2. Kontrollera att proxyn är igång
      Eftersom du har autostart aktiverat ska den redan rulla.

   1     npm run proxy:status
      Ser du en rad med `cloud-sql-proxy` är allt grönt. Ser du "❌
  Proxy not running", kör `npm run proxy:start`.

   3. Starta applikationen

   1     npm run dev
      Öppna http://localhost:3002 (eller den port Next.js väljer).

  ---

  Om det strular:

   * "Address already in use": Betyder att proxyn redan är igång i
     bakgrunden. Du behöver inte göra något, gå vidare till steg 3.
   * "Connection refused" / Röd banner i appen: Proxyn kanske har
     fastnat eller saknar rättigheter.
       1. Kör npm run proxy:restart
       2. Kolla loggarna med npm run proxy:logs

**Visual Indicators** (development only):
- **Green badge** (bottom-right): Database connected successfully
- **Red banner** (bottom-right): Connection error with fix instructions
- Auto-checks connection every 30 seconds

**Architecture**:
```
Next.js (localhost:3002)
    ↓ DATABASE_URL=postgresql://...@localhost:5432/newsdeck
Cloud SQL Proxy (localhost:5432)
    ↓ Secure tunnel
Cloud SQL Production DB (europe-west1)
```

**Important**:
- Local dev NEVER uses mock data
- Changes are made to production database (be careful!)
- Proxy uses minimal resources, safe to leave running
- Full documentation: `docs/LOCAL_DEVELOPMENT.md`

## Architecture Overview

**Framework**: Next.js 15 with App Router, React 19, TypeScript, TailwindCSS

### Core Data Model
```typescript
interface NewsItem {
  id?: string;           // Källans eget ID (valfritt, ej unikt)
  dbId: string;          // UUID, unikt i databasen
  workflowId: string;    // columnId eller workflowId (internt fält)
  source: string;
  timestamp: string;     // ISO 8601
  title: string;
  description?: string;
  newsValue: number;     // 1–5, 5 = högst prioritet
  category?: string;
  severity?: string | null; // Fri textsträng, ingen enum-validering
  location?: {
    name?: string;
    county?: string;
    municipality?: string;
    coordinates?: number[];
    countryCode?: string;   // ISO 3166-1 alpha-2, t.ex. "SE"
    regionCode?: string;    // SCB 2-siffrig, t.ex. "01"
    municipalityCode?: string; // SCB 4-siffrig, t.ex. "0180"
  };
  extra?: Record<string, any>;
  raw?: any;
}
```

### Key Architecture Components

**Database Layer** (`lib/`):
- `db.ts` - Database interface/abstraction (publik API mot resten av appen)
- `db-postgresql.ts` - `persistentDb`-objektet som re-exporterar funktioner från `lib/db/`-modulerna nedan. Innehåller bara orkestrerande helpers (`clearAllData`, `syncAllColumnsDataFromGeneral`, `isConnected`).
- `db/pool.ts` - Pg-pool-skapande (Unix socket i prod, TCP lokalt via Cloud SQL Proxy)
- `db/constants.ts` - `MAIN_DASHBOARD_ID`, `DEFAULT_DASHBOARD`
- `db/batch.ts` - `buildBatchInsert` (chunkar bulk-INSERTs under pg-parametertaket)
- `db/news-items.ts` - CRUD mot `news_items`
- `db/column-data.ts` - CRUD mot `column_data` (denormaliserad cache)
- `db/dashboards.ts` - CRUD mot `dashboards` + kolumnhantering (kolumner ligger som JSONB i raden)
- `db/user.ts` - User preferences + dashboard follows
- `db/admin.ts` - Drift-helpers (cleanup, API request log)
- Falls back to in-memory storage when DATABASE_URL unavailable (development only)

**API Routes** (`app/api/`):
- `/api/workflows` - **Primärt ingestion-API** (POST med `columnId`, kräver API-nyckel)
- `/api/columns` - Column management (CRUD); GET är publik, POST är borttagen (använd /api/workflows)
- `/api/dashboards` - Dashboard management (returns max 500 most recent items per column)
  - `?structureOnly=true` - Skip column data, return only dashboard structure (used by initial page load)
- `/api/news-items` - NewsItem storage and retrieval (intern användning)

**Atom Feed Routes** (`app/feeds/`):
- `/feeds/columns/[id]` - Atom 1.0-feed med 50 senaste items från en kolumn
- `/feeds/dashboards/[slug]` - Atom 1.0-feed med 50 senaste items från hela dashboardet (alla kolumner sammanslagda)
- Publika routes, ingen autentisering krävs
- Cache-Control: `public, max-age=60`
- Implementeras via npm-paketet `feed`
- Hjälpbibliotek: `lib/feeds/atom.ts`
- Feed-ikoner (Rss) i kolumn-header och dashboard-header kopierar URL till clipboard

**Ingestion Pipeline** (`lib/services/ingestion.ts`):
- Tar emot `columnId` direkt. Det är ENDA routing-mekanismen — workflowId-routing-vägen (flowId-lookup via dashboard-listan) är borttagen (P1-5). Workflows-noden måste skicka `columnId`.
- Sparar `location`-objektet rakt av till JSONB. Ingen validering eller mappning av geo-koder sker i Newsdeck — eventuell geo-berikning ska ske i Workflows innan posten skickas hit.
- Reservtabellerna `countries`, `regions`, `municipalities` finns kvar i databasen men används inte längre av koden.

**Performance Limits**:
- **Column Item Limit**: 500 most recent items per column (defined in dashboard API routes)
  - Location: `app/api/dashboards/[slug]/route.ts` and `app/api/dashboards/main-dashboard/route.ts`
  - All items stored in database, but API returns only 500 newest for performance
  - Frontend displays 25 items initially, then loads 25 more via infinite scroll

**Core Pages**:
- `/` - Dashboard listing homepage
- `/admin` - Data input interface
- `/dashboard/[id]` - Individual dashboard view with real-time updates
- `/test-persistence` - Database connectivity testing

### Visual Priority System
NewsValue determines visual styling via the design system v2 (`lib/design-system.ts`):
- `newsValue: 5` - Kritisk: röd ribbon (`oklch(0.66 0.22 25)`), emph-klass (bakgrundston)
- `newsValue: 4` - Hög: amber ribbon (`oklch(0.78 0.17 65)`), emph-klass
- `newsValue: 3` - Medel: cyan ribbon (`oklch(0.76 0.13 220)`)
- `newsValue: 1-2` - Låg: grå ribbon

UI:t refererar aldrig till P1–P5 — bara `newsValue` (siffra) och namnen ovan.

**Design System v2** (`lib/design-system.ts` + `app/globals.css` CSS-token-block `--nd-*`):
- Fonts: Inter Tight (UI), JetBrains Mono (metadata)
- Dark theme default, light theme via `html.light`
- Helper-funktioner: `getPriority()`, `getColumnColor()`, `timeAgo()`, `timeExact()`, `timeBucket()`

**Dashboard Views** (desktop):
- Kolumner (default): befintlig kolumnlayout med uppdaterade kort
- Pulse (`components/views/PulseView.tsx`): kronologisk flödesvy med filtersidebar
- Grid (`components/views/GridView.tsx`): tät bricköversikt, items med högt newsValue (4–5) får stora brickor
- Vy-switcher i header, sparas i localStorage (`nd.viewMode`)

## Storage & Deployment

**Local Development**: Uses in-memory storage when DATABASE_URL not set

**Production**: Uses PostgreSQL for persistence
- Environment variable: `DATABASE_URL` (PostgreSQL connection string)
- Deployed on **Google Cloud Run** (GCP)
- Database: Cloud SQL PostgreSQL (`newsdeck-db` in `europe-west1`)
- Production URL: `https://newsdeck-389280113319.europe-west1.run.app/`

## Database Management

### Migrations

Newsdeck använder ett enkelt migration-runner-script (`scripts/migrate.mjs`, P3-1) som spårar applicerade migrations i tabellen `schema_migrations`.

```bash
npm run db:migrate:status   # visa vilka migrations som körts/pending
npm run db:migrate:dry-run  # lista pending utan att köra dem
npm run db:migrate          # applicera alla pending migrations
```

Lägg nya migrations i `db/migrations/NNN_namn.sql` med numerisk prefix. Runnern kör dem i bokstavsordning, en transaktion per fil (undantag: `CREATE INDEX CONCURRENTLY` körs utan transaktion).

Befintliga migrations 001–012 markerades som applicerade på prod när runnern infördes — så `db:migrate` är en no-op tills nästa migration läggs till.

### Accessing Production Database

**Interactive SQL shell**:
```bash
# Connect to production database
gcloud sql connect newsdeck-db --user=newsdeck-user --database=newsdeck

# Or using connection string from .env
psql $DATABASE_URL
```

**Run SQL queries**:
```bash
# Execute a single query
gcloud sql connect newsdeck-db --user=newsdeck-user --database=newsdeck \
  -c "SELECT COUNT(*) FROM news_items;"

# Execute SQL from file
psql $DATABASE_URL -f path/to/query.sql
```

### Database Backups

**Automated backups**: ✅ ENABLED
- Daily backups at 03:00 UTC
- Retains 7 most recent backups
- Point-in-time recovery available

**List available backups**:
```bash
gcloud sql backups list --instance=newsdeck-db
```

**Restore from backup**:
```bash
# List backups to find backup ID
gcloud sql backups list --instance=newsdeck-db

# Restore (WARNING: This will overwrite current data!)
gcloud sql backups restore BACKUP_ID --backup-instance=newsdeck-db
```

### Important Database Constraints

**⚠️ CRITICAL: `addDashboard` uses ON CONFLICT DO NOTHING**

The `addDashboard` function in `lib/db-postgresql.ts` uses `ON CONFLICT (id) DO NOTHING`. This means calling it for an existing dashboard is a no-op. Use `updateDashboard` to modify existing dashboards.

**Historical note (2026-03-17)**: Previously used `ON CONFLICT DO UPDATE SET columns = EXCLUDED.columns` which caused main dashboard columns to be wiped when DEFAULT_DASHBOARD (with `columns: []`) was inserted on conflict. Fixed in commit `bb4fe99`.

**⚠️ CRITICAL: `source_id` is NOT globally unique!**

The `source_id` field comes from external sources and is NOT guaranteed to be unique:
- ✅ Some sources provide unique IDs (e.g., Trafikverket: `SE_STA_TRISSID_1_23222679`)
- ⚠️ Other sources have no IDs → AI-generated or NULL
- ⚠️ AI-generated IDs can collide (e.g., multiple items with `source_id: "1"`)

**Do NOT add a unique constraint on `source_id`!**

The application handles deduplication at the application level:
- See `lib/services/ingestion.ts:284-290` for deduplication logic
- When new items arrive with existing `source_id`, old items are removed from `column_data`
- This prevents the same event from appearing multiple times in the UI

**Unique identifiers**:
- `db_id` (UUID) - Guaranteed unique for each news item in database
- `id` / `source_id` - NOT unique, may be NULL or AI-generated

### Database Diagnostic Scripts

Check for duplicate source_ids:
```bash
node scripts/check-all-duplicates.mjs
```

Check specific news items:
```bash
node scripts/check-bronstunneln.mjs  # Example: Check Bronstunneln entries
```

Diagnose column data issues:
```bash
node scripts/diagnose-column.mjs COLUMN_ID  # Check column_data integrity
```

Fix missing dbId in column_data (IMPORTANT after 2025-12-01):
```bash
node scripts/fix-missing-dbids.mjs  # Ensures all items have dbId populated
```

**Note**: These scripts require `DATABASE_URL` in `.env` file


## Data Architecture: Denormalization Pattern

**⚠️ CRITICAL: Understanding the Two-Table Design**

The application uses a **denormalized data architecture** with two data sources that must be kept in sync:

### Tables

1. **`news_items`** (Source of Truth)
   - Stores each news item exactly once
   - Contains all authoritative data: `db_id`, `title`, `timestamp`, `location` (JSONB), etc.
   - This is the **single source of truth** for news item metadata

2. **`column_data`** (Denormalized Cache)
   - Stores a **duplicate copy** of news item data per column
   - Structure: `news_item_db_id` (foreign key) + `data` (JSONB with full item copy)
   - Created for performance optimization (avoid JOINs in dashboard queries)

### Why This Design?

**Original Intent**: Query performance optimization
```sql
-- Fast (current): No JOINs needed
SELECT data FROM column_data WHERE column_id = 'abc123'

-- Slower (normalized): Requires JOIN
SELECT ni.* FROM news_items ni
JOIN column_items ci ON ni.db_id = ci.news_item_db_id
WHERE ci.column_id = 'abc123'
```

### The Trade-Off

**Pros**:
- ✅ Faster dashboard queries (no JOINs)
- ✅ All item data in one JSONB field

**Cons**:
- ⚠️ Data duplication (same item stored multiple times)
- ⚠️ **Synchronization problems** - Fields must be kept in sync between:
  1. `news_items` table columns (e.g., `country_code`)
  2. `column_data.data` JSONB (e.g., `{countryCode: "SE"}`)
  3. `column_data` foreign key (`news_item_db_id`)
- ⚠️ More disk space
- ⚠️ Maintenance burden when adding new fields

### Reading column data

`getColumnData` och `getColumnDataBatch` läser endast från `column_data`-tabellen. `dbId` sätts från radens `news_item_db_id`; övriga fält kommer från JSONB-`data`-kolumnen. Om ett fält måste vara strikt synkat med `news_items` får man lägga till en explicit JOIN och override-mappning vid behov.


## External Integration

### Primärt API — Post till kolumn (rekommenderat)

Standardsättet att skicka in nyheter är att posta direkt till ett kolumn-ID via `/api/workflows`:

```json
POST /api/workflows
{
  "columnId": "1a5465c1-1fa8-4bc0-9fb2-dfb396a64d5a",
  "item": {
    "id": "valfritt-källid",
    "title": "Rubrik",
    "source": "Källnamn",
    "category": "brand",
    "severity": "Valfri sträng eller null",
    "newsValue": 3,
    "timestamp": "2026-03-23T10:30:00Z",
    "description": "Beskrivning",
    "location": {
      "name": "Platsnamn",
      "county": "Västerbottens län",
      "countryCode": "SE",
      "regionCode": "24",
      "coordinates": [64.3, 21.1]
    }
  },
  "extra": {}
}
```

- Kolumn-ID hittas i kolumnens inställningar i UI:t
- Kräver API-nyckel i `Authorization: Bearer <key>`-header
- `severity` är en fri textsträng (inga enum-krav)
- `location` sparas rakt av i JSONB — geo-koder valideras inte och används inte för filtrering, men kan användas för framtida berikning från egen geo-service.
- `workflowId` accepteras inte längre som routing-mekanism. Skicka alltid `columnId`.

**GET /api/columns/{id}** - Hämta kolumndata (publik, ingen auth)

## Header Architecture

**Global Header Component**:
- `components/GlobalHeader.tsx` - Unified header used across all pages
- Compound-komponent med tre zoner: `<GlobalHeader.Left>`, `<GlobalHeader.Center>`, `<GlobalHeader.Right>` (P3-10)
- Used by: `DashboardHeader.tsx` och `app/dashboards/page.tsx`

## Weather Display

- `components/WeatherCycle.tsx` cyklar genom städer (5s/intervall), tar emot data via `useWeather()` (`lib/hooks/useWeather.ts` mot `/api/weather`). Inga vädervarningar — workflows skickar dem som vanliga events sedan kodrensningen.

## Notification System

**Desktop & Audio Notifications** (added 2025-12-07, updated 2025-12-08):
- `lib/dashboard/hooks/useNotificationSettings.ts` - Manages notification settings (global + per-column)
- `lib/dashboard/hooks/useDesktopNotifications.ts` - Web Notifications API wrapper (Chrome desktop only)
- `lib/dashboard/hooks/useColumnNotifications.ts` - Coordinates audio and desktop notifications
- `components/NotificationSettingsModal.tsx` - Global settings modal (master toggle, defaults, threshold)

**Browser Support**:
- Desktop notifications: Chrome on desktop only (not mobile)
- Detects browser and device type, falls back gracefully for unsupported platforms
- Audio notifications: All browsers with Web Audio API support

**System Requirements for Desktop Notifications (Mac)**:
- Mac users must enable notifications in System Settings → Notifications → Chrome
- Notification style must be set to "Banners" or "Alerts" (not "None")
- Chrome site permissions must allow notifications (chrome://settings/content/notifications)

**Settings Storage**:
- Stored in localStorage per dashboard (`notificationSettings_${dashboardId}`)
- Migrates automatically from old `mutedColumns_${dashboardId}` format
- Per-column settings inherit from global defaults if not set

**Notification Settings Structure**:
```typescript
interface NotificationSettings {
  global: {
    masterEnabled: boolean           // Master toggle for all notifications
    defaultSoundEnabled: boolean     // Default for new columns
    defaultDesktopEnabled: boolean   // Default for new columns
    newsValueThreshold: 1-5          // Only notify for items >= this value
  }
  columns: Record<string, {
    soundEnabled: boolean
    desktopEnabled: boolean
  }>
}
```

**Access Points**:
- UserMenu dropdown -> "Notiser" button
- Opens NotificationSettingsModal with toggles and test button

## PWA Configuration

**Progressive Web App** (added 2025-12-08):
- `public/manifest.json` - PWA manifest with app metadata
- App name: "Newsdeck" (displays in notifications instead of URL)
- `app/layout.tsx` - Links to manifest and sets PWA metadata
- Theme color: #3b82f6 (blue)
- Display mode: standalone (hides browser UI when installed)


## Current Status

The application is a **production-ready system** with:
- ✅ Full dashboard and column management
- ✅ Real-time updates (long-polling)
- ✅ Visual priority system
- ✅ PostgreSQL persistence with optimized batch queries
- ✅ Admin interface for data input
- ✅ Responsive design for mobile/desktop/TV
- ✅ Desktop browser notifications (Web Notifications API, Chrome desktop only)
- ✅ Configurable audio/desktop notifications per column and globally
- ✅ PWA support for better notification UX

