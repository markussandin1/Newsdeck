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
  - Normalizes location metadata synchronously during ingestion (fallback mode)
  - Populates `countryCode`, `regionCode`, `municipalityCode` on `NewsItem`
  - Logs unmatched locations asynchronously (non-blocking)
- **Frontend Components**:
  - `lib/dashboard/hooks/useGeoFilters.ts` - Filter state management with localStorage
  - `components/GeoFilterPanel.tsx` - Collapsible filter UI with region/municipality selection
  - Integrated into `MainDashboard.tsx` - MapPin button next to search input
  - Filters combine with text search (AND operation)

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

## PWA Configuration

**Progressive Web App** (added 2025-12-08):
- `public/manifest.json` - PWA manifest with app metadata
- App name: "Newsdeck" (displays in notifications instead of URL)
- `app/layout.tsx` - Links to manifest and sets PWA metadata
- Theme color: #3b82f6 (blue)
- Display mode: standalone (hides browser UI when installed)


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

**Documentation**:
- See `docs/geo-service-api.md` for complete API reference
- Database migration: `db/migrations/001_geographic_metadata.sql`

**Current Data**:
- ✅ Sweden (SE): 21 regions, 290 municipalities
- 🔜 Norway, Denmark, Finland (prepared architecture)

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

