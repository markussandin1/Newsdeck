# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **newsdeck-production** repository containing a news dashboard application called **Newsdeck**. The main codebase is located in this irectory. The root also contains a GCP migration plan.

Newsdeck is fed events from another application, an ai-agent system called "Workflows". That posts events to our application. Both are built in house. 

Before you comitt something you must always update this file, claude.md

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

**Quick Setup** (one-time):
```bash
# Auto-start proxy on login (recommended)
npm run proxy:autostart
```

**Development Workflow**:
```bash
# Option 1: Just start dev (if proxy is auto-started)
npm run dev

# Option 2: All-in-one command (starts proxy + dev)
npm run dev:full

# Option 3: Manual proxy management
npm run proxy:start    # Terminal 1
npm run dev            # Terminal 2
```

**Proxy Management Commands**:
```bash
npm run proxy:status     # Check if running
npm run proxy:start      # Start proxy manually
npm run proxy:stop       # Stop proxy
npm run proxy:restart    # Restart proxy
npm run proxy:logs       # View proxy logs
npm run proxy:check      # Verify proxy (exits with error if not running)
```

**Troubleshooting**:
- **Empty page loads?** → Proxy not running: `npm run proxy:start`
- **ECONNREFUSED errors?** → Restart proxy: `npm run proxy:restart`
- **Check database health** → `curl http://localhost:3002/api/status/database`
- **View proxy logs** → `npm run proxy:logs`

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
  id: string;
  workflowId: string;
  source: string;
  timestamp: string; // ISO 8601
  title: string;
  description?: string;
  newsValue: 1 | 2 | 3 | 4 | 5; // 5 = highest priority
  category?: string;
  severity?: "critical" | "high" | "medium" | "low" | null;
  location?: {
    municipality?: string;
    county?: string;
    name?: string;
    coordinates?: [number, number];
  };
  extra?: Record<string, any>;
  raw?: any;
}
```

### Key Architecture Components

**Database Layer** (`lib/`):
- `db-postgresql.ts` - PostgreSQL storage implementation (production)
- `db.ts` - Database interface/abstraction
- Falls back to in-memory storage when DATABASE_URL unavailable (development only)

**API Routes** (`app/api/`):
- `/api/columns` - Column management (CRUD)
- `/api/dashboards` - Dashboard management (returns max 500 most recent items per column)
- `/api/news-items` - NewsItem storage and retrieval
- `/api/geo` - Geographic metadata API (countries, regions, municipalities)
- `/api/admin/location-cache` - Location cache management (POST to refresh, GET for stats)
- `/api/admin/location-mappings` - Location name mappings (GET unmatched, POST to create)

**Geographic Filtering System** (added 2025-12-29):
- **Database Schema**: 5 new reference tables for geographic metadata
  - `countries` - ISO country codes (e.g., 'SE' for Sweden)
  - `regions` - Swedish counties (län) with SCB codes (e.g., '01' = Stockholm)
  - `municipalities` - Swedish municipalities (kommuner) with SCB codes
  - `location_name_mappings` - Fuzzy matching variants (e.g., "stockholm" → "0180")
  - `location_normalization_logs` - Tracks unmatched locations for data quality
- **Location Cache** (`lib/services/location-cache.ts`):
  - Zero-latency in-memory lookups during ingestion
  - Automatically loaded on server startup via `instrumentation.ts`
  - Refresh via POST /api/admin/location-cache
- **Ingestion Pipeline** (`lib/services/ingestion.ts`):
  - **NEW (2025-12-30)**: Prioritizes geographic codes from Workflows AI agent
    - If `location.countryCode` and `location.regionCode` are provided, uses them directly
    - Skips fuzzy matching when codes are present (faster, more accurate)
    - Falls back to fuzzy matching only when codes are null/missing
  - **NEW (2026-01-01)**: Municipality code validation
    - Validates that `municipalityCode` matches `municipality` name when codes provided by AI agent
    - Logs mismatches to console with `console.warn()` (visible in Cloud Logs)
    - Saves mismatches to `location_normalization_logs` table for admin review
    - Non-blocking validation (doesn't fail ingestion)
  - Normalizes location metadata synchronously during ingestion (fallback mode)
  - Populates `countryCode`, `regionCode`, `municipalityCode` on `NewsItem`
  - Logs unmatched locations asynchronously (non-blocking)
- **Frontend Components**:
  - `lib/dashboard/hooks/useGeoFilters.ts` - Filter state management with localStorage
  - `components/GeoFilterPanel.tsx` - Collapsible filter UI with region/municipality selection
  - Integrated into `MainDashboard.tsx` - MapPin button next to search input
  - Filters combine with text search (AND operation)
- **Backend Geographic Filtering** (added 2026-01-08):
  - **Problem Solved**: Frontend filters on 500 items from all of Sweden resulted in too few items when filtering by small municipalities (e.g., Kiruna showed 8 items from 500 nationwide, but database had 50+ Kiruna events)
  - **Solution**: Geographic filtering moved to backend SQL queries
  - **Benefits**: Returns up to 500 items matching the filter (not 500 from entire country), less network traffic, faster filtering using database indexes
  - **Query Parameters**: API endpoints accept repeatable query params
    - `regionCode` (repeatable) - e.g., `?regionCode=01&regionCode=23`
    - `municipalityCode` (repeatable) - e.g., `?municipalityCode=0180&municipalityCode=2584`
    - `showItemsWithoutLocation` (boolean) - e.g., `?showItemsWithoutLocation=true`
  - **SQL Implementation** (`lib/db-postgresql.ts`):
    - New helper function `buildGeographicWhereClause()` builds dynamic WHERE clauses
    - Updated `getColumnData()` and `getColumnDataBatch()` to accept optional `geoFilters` parameter
    - Uses PostgreSQL `ANY()` operator for efficient array filtering
    - Supports implicit region-level filtering (shows region-level events when municipalities in that region are selected)
  - **API Integration**:
    - `app/api/dashboards/[slug]/route.ts` - Parses geo filter query params, passes to database layer
    - `app/api/dashboards/main-dashboard/route.ts` - Same as above
    - `app/api/columns/[id]/updates/route.ts` - Long-polling endpoint filters items from event queue client-side
  - **Frontend Integration**:
    - `useGeoFilters` hook computes `allRegionCodes` (combines explicit + implicit regions)
    - `useDashboardData` builds query parameters, refetches when filters change
    - `useDashboardPolling` passes filters to long-polling endpoint
    - `MainDashboard.tsx` simplified to only apply text search client-side (geo filtering now backend)
  - **Performance**: Text search remains client-side for instant filtering, geographic filtering at SQL level using existing indexes

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
NewsValue determines visual styling:
- `newsValue: 5` - Red border + pulsing animation (critical)
- `newsValue: 4` - Orange border (high)
- `newsValue: 3` - Yellow border (medium)
- `newsValue: 1-2` - Gray border (low)

## Storage & Deployment

**Local Development**: Uses in-memory storage when DATABASE_URL not set

**Production**: Uses PostgreSQL for persistence
- Environment variable: `DATABASE_URL` (PostgreSQL connection string)
- Deployed on **Google Cloud Run** (GCP)
- Database: Cloud SQL PostgreSQL (`newsdeck-db` in `europe-west1`)
- Production URL: `https://newsdeck-389280113319.europe-west1.run.app/`

## Database Management

### Accessing Production Database

**Prerequisites**:
- Install PostgreSQL client: `brew install postgresql@17` (required by gcloud sql connect)

**Interactive SQL shell**:
```bash
# Connect to production database (recommended)
gcloud sql connect newsdeck-db --user=newsdeck-user --database=newsdeck
```

**Run SQL queries**:
```bash
# Execute a single query
gcloud sql connect newsdeck-db --user=newsdeck-user --database=newsdeck \
  -c "SELECT COUNT(*) FROM news_items;"

# Execute SQL from file (migrations)
cat db/migrations/001_example.sql | gcloud sql connect newsdeck-db --user=newsdeck-user --database=newsdeck
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

**Geographic Code Validation** (added 2026-01-01):
```bash
# Find items with mismatched municipality codes
node scripts/find-mismatched-codes.mjs

# Fix municipality codes that don't match location names (dry run)
node scripts/fix-municipality-codes.mjs --dry-run

# Actually fix the codes in database
node scripts/fix-municipality-codes.mjs --fix
```

**Note**: These scripts require `DATABASE_URL` in `.env` file

### Critical Bug Fix (2025-12-01): Missing dbId in column_data

**Issue**: Items in `column_data` table could have missing or incorrect `dbId` in their JSON data, causing them to be silently skipped during re-ingestion, resulting in columns losing items over time.

**Root Cause**: The `news_item_db_id` foreign key was stored separately from the JSON `data` column, but the JSON `dbId` field wasn't always synchronized.

**Fix Applied**:
- Modified `getColumnData` and `getColumnDataBatch` to always populate `dbId` from the `news_item_db_id` foreign key (lib/db-postgresql.ts:583-588, 624-629)
- This ensures items are never skipped during re-ingestion, even if their stored JSON is missing dbId

**Migration**: Run `node scripts/fix-missing-dbids.mjs` on production to fix existing data

## Data Architecture: Denormalization Pattern

**⚠️ CRITICAL: Understanding the Two-Table Design**

The application uses a **denormalized data architecture** with two data sources that must be kept in sync:

### Tables

1. **`news_items`** (Source of Truth)
   - Stores each news item exactly once
   - Contains all authoritative data: `db_id`, `title`, `timestamp`, `country_code`, `region_code`, `municipality_code`, etc.
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

### Synchronization Fixes Applied

**When reading column data**, we now **override stale JSONB values** with fresh data from `news_items`:

**In `lib/db-postgresql.ts`** (both `getColumnData` and `getColumnDataBatch`):
```typescript
// Join with news_items to get current values
SELECT cd.data, cd.news_item_db_id,
       ni.country_code, ni.region_code, ni.municipality_code
FROM column_data cd
LEFT JOIN news_items ni ON ni.db_id = cd.news_item_db_id

// Override JSONB with current values from news_items
return {
  ...data,
  dbId: row.news_item_db_id,              // Fix 2025-12-01
  countryCode: row.country_code || data.countryCode,         // Fix 2025-12-30
  regionCode: row.region_code || data.regionCode,            // Fix 2025-12-30
  municipalityCode: row.municipality_code || data.municipalityCode  // Fix 2025-12-30
}
```

**Why This Pattern?**
- `news_items` is the authoritative source
- JSONB in `column_data` may contain stale/incorrect values
- We pull fresh values on every read to prevent filtering bugs

### Critical Rules for Adding New Fields

**When adding a new field to NewsItem:**

1. ✅ Add column to `news_items` table
2. ✅ Add field to TypeScript interface
3. ⚠️ **MUST** add synchronization in `getColumnData` and `getColumnDataBatch`:
   ```typescript
   // In both functions, add:
   SELECT cd.data, cd.news_item_db_id, ni.your_new_field
   FROM column_data cd
   LEFT JOIN news_items ni ON ni.db_id = cd.news_item_db_id

   // In return mapping:
   return {
     ...data,
     yourNewField: row.your_new_field || data.yourNewField
   }
   ```
4. ⚠️ Otherwise filtering/display bugs will occur as JSONB becomes stale

### Known Synchronization Bugs Fixed

1. **Missing dbId (2025-12-01)**
   - Items without `dbId` in JSONB were silently skipped during re-ingestion
   - Columns would lose items over time
   - Fixed by pulling `dbId` from `news_item_db_id` foreign key

2. **Geographic Codes Not Syncing (2025-12-30)**
   - Items had `null` values for `countryCode`/`regionCode`/`municipalityCode` in JSONB
   - Geographic filtering showed wrong/missing items
   - Fixed by pulling codes from `news_items` table on every read

### Alternative Architecture Considered

**Normalized single-source design** (not implemented):
```sql
-- Replace column_data with simple junction table
CREATE TABLE column_items (
  column_id UUID,
  news_item_db_id UUID,
  created_at TIMESTAMP
);

-- Query with JOIN (single source of truth)
SELECT ni.* FROM news_items ni
JOIN column_items ci ON ni.db_id = ci.news_item_db_id
WHERE ci.column_id = $1
```

**Why not implemented?**
- Would require significant refactoring
- JOIN performance acceptable for current scale
- Decision made to keep current architecture but document limitations

### Summary

- We have intentional data duplication for performance
- **`news_items` is always the source of truth**
- **`column_data` JSONB may contain stale data**
- Always pull critical fields from `news_items` when reading
- When adding new fields, update synchronization logic in `getColumnData` and `getColumnDataBatch`

## External Integration

**API Endpoints** for workflow integration:
- `POST /api/columns/{id}` - Add news items to column
- `GET /api/columns/{id}` - Retrieve column data
- Compatible with n8n, Zapier, and custom workflows

**Event Schema** (for Workflows application):
- Schema location: `docs/schemas/workflows-event-schema.json`
- **NEW (2025-12-30)**: Location object now supports direct geographic codes:
  - `location.countryCode` (required): ISO 3166-1 alpha-2 (e.g., "SE")
  - `location.regionCode` (required): SCB län code, 2-digit numeric (e.g., "01" for Stockholm, "23" for Jämtland)
  - `location.municipalityCode` (nullable): SCB kommun code, 4-digit numeric (e.g., "0180" for Stockholm)
- **Code Format**: Uses official SCB (Statistics Sweden) numeric codes, NOT ISO 3166-2 letter codes
- When AI agent provides these codes, Newsdeck trusts them directly (no fuzzy matching)
- If codes are null/missing, falls back to fuzzy matching on text fields

## Header Architecture

**Global Header Component**:
- `components/GlobalHeader.tsx` - Unified header used across all pages
- Handles: logo, weather warnings, weather display, date/time, user menu
- Accepts `contextContent` prop for page-specific content (Zone 2)
- Eliminates code duplication between different pages
- Used by: `DashboardHeader.tsx` and `app/dashboards/page.tsx`

## Weather Display Architecture

**Weather Cycle Component** (Desktop & Mobile):
- `components/WeatherCycle.tsx` - Pure display component that cycles through cities
- Displays one city at a time with 5-second intervals
- Receives weather data via `useWeather()` hook (managed by GlobalHeader)
- Pauses on hover/focus for accessibility
- Used in: `GlobalHeader.tsx` and `MainDashboard.tsx` (mobile)

**Weather Warnings (SMHI Integration)**:
- `components/WeatherWarningBanner.tsx` - Prominent banner showing first warning with headline and time
- `components/WeatherWarningModal.tsx` - Detailed warning popup with filters and map
- `components/SMHIWarningIcon.tsx` - Shared SVG icon component
- Severity levels: Gul (yellow circle), Orange (diamond), Röd (red triangle)
- Banner displays above weather/datetime in both desktop and mobile views

**Data Hooks**:
- `lib/hooks/useWeather.ts` - Fetches weather data from `/api/weather`, caches for 1 hour
- `lib/hooks/useWeatherWarnings.ts` - Fetches SMHI warnings from `/api/weather-warnings`, refreshes every 5 minutes

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

**Debugging**:
- Desktop notifications log extensively to console
- Check for "✅ Notification shown successfully!" in console to verify system-level display

**Removed Components**:
- ❌ `WeatherTicker.tsx` - Replaced by WeatherCycle (2025-12-02)
- ❌ `WeatherCityCard.tsx` - Replaced by inline rendering (2025-12-02)
- ❌ `WeatherStrip.tsx` - Consolidated to WeatherCycle for simplicity (2025-12-07)
- ❌ `WeatherWarningIndicator.tsx` - Was only used by WeatherStrip (2025-12-07)
- ❌ `WeatherWarningBadge.tsx` - Replaced by WeatherWarningBanner for better visibility (2025-12-07)

## PWA Configuration

**Progressive Web App** (added 2025-12-08):
- `public/manifest.json` - PWA manifest with app metadata
- App name: "Newsdeck" (displays in notifications instead of URL)
- `app/layout.tsx` - Links to manifest and sets PWA metadata
- Theme color: #3b82f6 (blue)
- Display mode: standalone (hides browser UI when installed)

**Benefits**:
- Desktop notifications show "Newsdeck" instead of the full URL
- Users can install the app to their desktop/home screen
- Standalone app experience when installed

## Geographic Service

**Location-Based Filtering** (added 2025-12-29):
- Multi-country support with ISO 3166-2 codes
- Hierarchical data: countries → regions (län) → municipalities (kommuner)
- In-memory cache for fast location lookups during ingestion
- Automatic location normalization for incoming news items
- Frontend filter panel for geographic filtering

**Data Model**:
```typescript
interface Country {
  code: string;          // ISO 3166-1 alpha-2 (e.g., "SE")
  name: string;          // "Sweden"
}

interface Region {
  countryCode: string;   // "SE"
  code: string;          // ISO 3166-2 without prefix (e.g., "AB" for SE-AB)
  name: string;          // "Stockholms län"
  nameShort?: string;    // "Stockholm"
}

interface Municipality {
  countryCode: string;   // "SE"
  regionCode: string;    // "AB"
  code: string;          // "0114"
  name: string;          // "Upplands Väsby"
}
```

**API Endpoints**:
- `GET /api/geo` - Returns all geographic metadata (21 regions, 290 municipalities for Sweden)
- `GET /api/geo?type=regions&countryCode=SE` - Returns regions for a country
- `GET /api/geo?type=municipalities&countryCode=SE&regionCode=AB` - Returns municipalities
- `POST /api/admin/location-cache` - Refreshes in-memory cache (after imports)

**Cache Settings**:
- Browser cache: 5 minutes (`max-age=300`)
- CDN cache: 5 minutes
- Rate limit: 100 requests/minute per IP

**Data Import**:

Add new countries by creating JSON files in `data/geo/` and running the import script:

```bash
# Import geographic data from structured JSON
node scripts/import-geo-data.mjs data/geo/SE.json

# Clean all geographic data (use with caution!)
node scripts/clean-geo-data.mjs
```

**JSON Format for Geographic Data**:
```json
{
  "country": "SE",
  "subdivisions": [
    {
      "level": 1,
      "code": "SE-AB",
      "name": "Stockholms län",
      "type": "county"
    },
    {
      "level": 2,
      "code": "SE-0114",
      "name": "Upplands Väsby",
      "type": "municipality",
      "parent": "SE-AB"
    }
  ]
}
```

**Code Format Conventions**:
- **JSON files:** Use full ISO codes with country prefix (e.g., `"SE-AB"`, `"SE-0114"`)
- **Database:** Stores codes without country prefix (e.g., `"AB"`, `"0114"`) with separate `country_code` column
- **API responses:** Returns codes without prefix, country code as separate field

**Location Normalization**:

During news item ingestion (`lib/services/ingestion.ts`), locations are automatically normalized:
1. Raw location data arrives (e.g., `{name: "Stockholm"}`)
2. Location cache performs fuzzy lookup using name variants
3. Best match selected based on priority (exact > fuzzy)
4. News item enriched with normalized codes:
   ```typescript
   {
     countryCode: "SE",
     regionCode: "AB",
     municipalityCode: null  // if only region matched
   }
   ```

**Name Variant Generation**:

The import script automatically generates variants for better matching:
- **Regions:** "Stockholms län" → ["Stockholm", "Stockholms", "Sthlm"]
- **Municipalities:** "Upplands Väsby" → ["Väsby", "Upplands Vasby", "Vasby"]
- **ASCII variants:** "Örnsköldsvik" → ["Ornskoldsvik"]

**Database Schema**:
- `countries` - Country reference data
- `regions` - Regions/counties with ISO 3166-2 codes
- `municipalities` - Municipalities with parent region references
- `location_name_mappings` - Fuzzy name matching (506 variants for Sweden)
- `location_normalization_logs` - Failed lookup tracking for data quality

**Frontend Components**:
- `lib/dashboard/hooks/useGeoFilters.ts` - Filter state management with localStorage persistence
- `components/GeoFilterPanel.tsx` - UI with search, expandable regions, municipality checkboxes
- `components/MainDashboard.tsx` - Integrated with existing text search filters

**Known Issues & Fixes**:

**Fixed 2025-12-30**: Geographic filter showing items from unrelated regions
- **Problem**: When selecting Stockholm municipality, items from Eskilstuna, Helsingborg, etc. were still visible
- **Root cause**: Many news items could not be normalized (e.g., `location.name = "Helsingborg"` without proper `location.municipality` or `location.county`), resulting in `undefined` geographic codes. The filter defaulted to showing these un-normalized items (`showItemsWithoutLocation: true`), causing them to appear even when filtering by specific municipality.
- **Fix**: Changed default `showItemsWithoutLocation` to `false` in `useGeoFilters.ts`. Added migration for existing localStorage data to force this setting to `false`.
- **Impact**: Now when filtering by municipality/region, only items with properly normalized location codes are shown. Users can manually enable "Visa utan plats" toggle if needed.

**Improved 2025-12-30**: Smart implicit region-level filtering
- **Feature**: Region-level events now automatically show when ANY municipality in that region is selected
- **Example**: When selecting any Stockholm municipality (e.g., only Botkyrka), events that only have `regionCode: "01"` (Stockholm län) but no specific municipality are included
- **Use case**: Events that affect entire regions (e.g., "Snöoväder i Stockholm län") are now visible even when filtering by specific municipalities
- **Implementation**: Uses memoized `regionsWithSelectedMunicipalities` Set for O(1) lookup performance in `lib/dashboard/hooks/useGeoFilters.ts`

**Fixed 2025-12-31**: Geographic filter search not finding municipalities
- **Problem**: Searching for municipalities like "Västerås" showed "Inga resultat" even though the municipality exists
- **Root cause**: Search logic only checked region names, not municipality names (`GeoFilterPanel.tsx:47-52`)
- **Fix**: Updated `filteredRegions` useMemo to also include regions containing matching municipalities
- **UX improvement**: Added auto-expand for regions with matching municipalities when searching, with manual collapse tracking to respect user preferences
- **Impact**: Users can now search for any municipality name and immediately see results with the parent region auto-expanded

**Fixed 2026-01-08**: Geographic Data Corruption - Incorrect Municipality Codes
- **Problem**: Municipality codes in `data/geo/SE_SCB.json` were incorrect for 23 out of 290 municipalities, causing wrong municipality names to appear when filtering (e.g., code 2280 showed Örnsköldsvik instead of Härnösand in Västernorrlands län)
- **Root cause**: Source JSON file had municipalities in wrong order compared to official SCB (Statistics Sweden) municipality codes. Additionally, auto-correction logic in `lib/services/ingestion.ts` was "correcting" correct codes from Workflows with wrong codes from our database.
- **Affected regions**: Västmanland (3 municipalities), Dalarna (13), Västernorrland (5), Västerbotten (2)
- **Fix applied**:
  1. Created verification script (`scripts/verify-scb-codes.mjs`) to compare our data against official SCB CSV
  2. Generated completely new `SE_SCB_corrected.json` from official `kommunlankod_2025.csv` using `scripts/generate-scb-json-from-csv.mjs`
  3. Created database backup before making changes
  4. Cleaned and re-imported all geographic data using corrected JSON file
  5. Fixed 13 existing news_items to use correct municipality codes based on municipality names (`scripts/fix-news-items-municipality-codes.mjs`)
  6. Reverted auto-correction logic in `lib/services/ingestion.ts` - now trusts geographic codes from Workflows AI agent (they are correct!)
- **Scripts created**: `verify-scb-codes.mjs`, `generate-scb-json-from-csv.mjs`, `fix-news-items-municipality-codes.mjs`
- **Reference**: Official SCB codes at https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/lan-och-kommuner/lan-och-kommuner-i-kodnummerordning/
- **Impact**: Geographic filtering now shows correct municipalities, Workflows codes are trusted (not auto-corrected), all 290 municipalities verified against official SCB data

**Documentation**:
- See `docs/geo-service-api.md` for complete API reference
- Database migration: `db/migrations/001_geographic_metadata.sql`

**Current Data**:
- ✅ Sweden (SE): 21 regions, 290 municipalities
- 🔜 Norway, Denmark, Finland (prepared architecture)

## Traffic Camera Image Storage

**Persistent Image Storage System** (added 2026-01-02):
- Traffic camera images are stored in Google Cloud Storage instead of linking directly to Trafikverket
- Ensures images remain available even if Trafikverket removes them
- Supports image history for each event (up to 10 snapshots per NewsItem)

### Architecture

**Storage Backend**:
- **GCS Bucket**: `newsdeck-traffic-images` (europe-west1)
- **Access**: Public read (traffic images are public data)
- **Lifecycle**: 90-day backup via GCS lifecycle rule + intelligent app-level cleanup
- **Path structure**: `gs://bucket/{newsItemId}/{timestamp}.jpg`

**Asynchronous Upload Pipeline**:
```
Ingestion → Queue upload job → Return 200 OK (fast!)
    ↓
Background Worker → Fetch from Trafikverket
                 → Upload to GCS
                 → Update NewsItem (status: ready)
```

**Database Schema** (migration `003_traffic_image_storage.sql`):
- `image_upload_queue` - Asynchronous upload queue with retry logic (max 3 retries)
- `traffic_images` - Tracks GCS images for intelligent cleanup

**NewsItem Data Structure**:
```typescript
extra: {
  trafficCamera: {
    id: string;
    name: string;
    distance: number;
    status: 'pending' | 'ready' | 'failed';  // Upload status
    currentUrl?: string;        // GCS URL (persistent)
    currentTimestamp?: string;
    photoUrl?: string;          // Fallback for backward compatibility
    history?: Array<{           // Max 10 snapshots
      url: string;
      timestamp: string;
    }>;
  }
}
```

### Components & Services

**Core Services**:
- `lib/services/storage-service.ts` - GCS upload/delete operations
- `lib/services/image-queue-service.ts` - Database-backed queue management
- `lib/services/image-upload-worker.ts` - Background worker (starts on server boot)
- `lib/services/image-cleanup-service.ts` - Intelligent cleanup (deletes orphaned images)

**API Endpoints**:
- `POST /api/traffic-cameras/refresh` - Manual image refresh (rate limited: 60s cooldown)
- `GET /api/cron/cleanup-images` - Daily cleanup job (Cloud Scheduler)

**Frontend Components**:
- `components/NewsItemModal.tsx` - Shows camera status, countdown timer, error messages
- `components/NewsItem.tsx` - Uses `currentUrl` or `photoUrl` for backward compatibility

### Ingestion Flow

**When Traffic Event Arrives**:
1. Find nearest camera (existing logic via `traffic-camera-service.ts`)
2. Fetch live snapshot URL from Trafikverket API
3. Save NewsItem with `status: 'pending'` and `photoUrl` (for fallback)
4. Queue image upload job (non-blocking)
5. Return 200 OK to Workflows

**Background Worker**:
1. Poll queue for pending jobs
2. Download image from Trafikverket
3. Upload to GCS (path: `{newsItemId}/{timestamp}.jpg`)
4. Save to `traffic_images` table
5. Update NewsItem: `status: 'ready'`, `currentUrl: gcsUrl`, append to `history`
6. Mark queue job as completed

**On Failure**:
- Retry up to 3 times with exponential backoff
- Set `status: 'failed'` with error message
- UI shows error banner with retry option

### Intelligent Cleanup

**Lifecycle Strategy**:
- Images are NOT deleted after a fixed time period
- Instead, images are deleted when their NewsItem disappears from all columns

**Daily Cleanup Process** (runs at 03:00 UTC):
1. Find NewsItems not in any `column_data` entries
2. Mark their images as `marked_for_deletion`
3. Wait 7 days (grace period)
4. Delete from GCS and `traffic_images` table

**Benefits**:
- Events visible for 35+ days keep their images
- No data loss for long-running incidents
- 7-day grace period allows recovery from accidental deletions

### Refresh Functionality

**Rate Limiting**:
- 60-second cooldown per NewsItem
- UI shows countdown timer on refresh button
- Returns HTTP 429 if rate limited

**User Flow**:
1. Click refresh button in NewsItemModal
2. Button disabled, shows countdown (e.g., "45s")
3. New image queued for upload
4. Status changes to 'pending' ("Hämtar ny bild...")
5. Worker processes upload (~5-10 seconds)
6. UI updates via long-polling when status becomes 'ready'

### Deployment Checklist

**Infrastructure Setup**:
```bash
# 1. Create GCS bucket
gcloud storage buckets create gs://newsdeck-traffic-images \
  --location=europe-west1 \
  --uniform-bucket-level-access

# 2. Make bucket publicly readable
gcloud storage buckets add-iam-policy-binding gs://newsdeck-traffic-images \
  --member=allUsers \
  --role=roles/storage.objectViewer

# 3. Grant Cloud Run write access
gcloud storage buckets add-iam-policy-binding gs://newsdeck-traffic-images \
  --member="serviceAccount:newsdeck-service@newsdeck-prod.iam.gserviceaccount.com" \
  --role=roles/storage.objectAdmin

# 4. Set lifecycle rule (90-day backup)
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {"age": 90}
    }]
  }
}
EOF
gcloud storage buckets update gs://newsdeck-traffic-images --lifecycle-file=lifecycle.json

# 5. Create Cloud Scheduler job (daily cleanup at 03:00 UTC)
gcloud scheduler jobs create http image-cleanup \
  --location=europe-west1 \
  --schedule="0 3 * * *" \
  --uri="https://newsdeck-389280113319.europe-west1.run.app/api/cron/cleanup-images" \
  --http-method=GET \
  --headers="X-Cloudscheduler=YOUR_CRON_SECRET" \
  --oidc-service-account-email=newsdeck-service@newsdeck-prod.iam.gserviceaccount.com
```

**Environment Variables**:
```env
GCS_TRAFFIC_IMAGES_BUCKET=newsdeck-traffic-images
CRON_SECRET=your-secret-here
```

**Database Migration**:
```bash
# Run migration 003
cat db/migrations/003_traffic_image_storage.sql | gcloud sql connect newsdeck-db --user=newsdeck-user --database=newsdeck
```

**Verification**:
1. Check worker started: `curl http://localhost:3002/api/status` (logs should show "Starting image upload worker")
2. Create test traffic event via Workflows
3. Verify `status: pending` in NewsItem
4. Wait 5-10 seconds
5. Verify `status: ready` and `currentUrl` populated
6. Check GCS Console for uploaded image

### Cost Estimation

**Storage** (GCS Standard, europe-west1):
- 4,500 images/month × 500KB = 2.25GB
- $0.020/GB/month = $0.045/month

**Network Egress**:
- 4,500 images × 10 views × 500KB = 22.5GB
- To Cloud Run (same region): $0
- To internet: 22.5GB × $0.12 = $2.70/month

**Total: ~$3/month**

### Monitoring

**Queue Stats**:
```sql
SELECT status, COUNT(*) FROM image_upload_queue GROUP BY status;
```

**Image Stats**:
```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE marked_for_deletion = false) as active,
  COUNT(*) FILTER (WHERE marked_for_deletion = true) as marked
FROM traffic_images;
```

**Cloud Logging Searches**:
- Upload success: `"Image uploaded for NewsItem"`
- Worker errors: `"Image upload failed"`
- Cleanup results: `"Daily cleanup completed"`

### Backward Compatibility

**Old Items** (before 2026-01-02):
- Have only `photoUrl` (Trafikverket URL)
- Still work via fallback: `currentUrl || photoUrl`
- No migration needed for existing data

**New Items** (after 2026-01-02):
- Have both `currentUrl` (GCS) and `photoUrl` (Trafikverket)
- `photoUrl` stored for reference and as upload source
- Frontend prefers `currentUrl` but falls back to `photoUrl`

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
- ✅ Geographic filtering with multi-country support (ISO 3166-2)
- ✅ Automatic location normalization for incoming news

