# Arkitekturanalys: NewsDeck Production

**Datum:** 2025-10-01
**Analyserad av:** Backend Architecture Advisor Agent
**Version:** Post multi-user implementation

---

## Sammanfattande bedömning

Din applikation har växt från en POC till en multi-user system och har **generellt en solid grund**, men det finns **kritiska säkerhetshål** och **flera områden som kräver förbättring** innan produktionslansering. Arkitekturen håller ihop konceptuellt, men övergången från single-user till multi-user har introducerat inkonsekvent auktorisering som måste åtgärdas omedelbart.

**Riskbedömning: MEDEL till HÖG** - Huvudproblemet är säkerhet, inte struktur.

---

## Identifierade problem

### 🔴 KRITISKT - Säkerhetsbrister

#### 1. Saknad ägarskapsvalidering vid dashboard-uppdatering
**Fil:** `/app/api/dashboards/[slug]/route.ts` (PUT endpoint, rad 64-109)

**Problem:** Vilken inloggad användare som helst kan uppdatera VILKEN dashboard som helst, inklusive andras dashboards.

```typescript
export async function PUT(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  // ❌ Ingen kontroll att användaren äger dashboarden!
  const result = await db.updateDashboard(dashboardId, body)
```

**Risk:**
- Användare A kan ändra namn, kolumner och inställningar på användare B:s dashboard
- Användare kan sabotage andras arbete
- Ingen audit trail över vem som gjorde ändringar

**Rekommenderad åtgärd:**
```typescript
export async function PUT(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const dashboard = await db.getDashboardBySlug(slug)
  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  // ✅ Verifiera ägarskap
  if (dashboard.createdBy !== session.user.email) {
    return NextResponse.json(
      { error: 'Forbidden - you do not own this dashboard' },
      { status: 403 }
    )
  }

  const result = await db.updateDashboard(dashboard.id, body)
  // ...
}
```

---

#### 2. Saknad ägarskapsvalidering vid kolumn-arkivering
**Fil:** `/app/api/columns/[id]/archive/route.ts` (rad 4-36)

**Problem:** Ingen autentiseringskontroll eller ägarskapsvalidering.

```typescript
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // ❌ INGEN autentisering eller ägarskapsvalidering!
  const updatedDashboard = await db.removeColumnFromDashboard(dashboardId, columnId)
```

**Risk:**
- Vem som helst kan arkivera kolumner från vilken dashboard som helst
- Data kan försvinna för användare utan att de vet varför

**Samma problem finns i:**
- `/app/api/columns/[id]/restore/route.ts` - Ingen auth
- `/app/api/columns/archived/route.ts` - Ingen ägarskapsvalidering

**Rekommenderad åtgärd:**
```typescript
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const params = await context.params
  const columnId = params.id
  const { searchParams } = new URL(request.url)
  const dashboardId = searchParams.get('dashboardId') || 'main-dashboard'

  // Hämta dashboard och verifiera ägarskap
  const dashboard = await db.getDashboard(dashboardId)
  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  if (dashboard.createdBy !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updatedDashboard = await db.removeColumnFromDashboard(dashboardId, columnId)
  // ...
}
```

---

#### 3. POST /api/news-items saknar autentisering
**Fil:** `/app/api/news-items/route.ts` (rad 6-53)

**Problem:** Ingen API-key eller session-validering.

```typescript
export async function POST(request: NextRequest) {
  // ❌ Ingen autentisering alls! Vem som helst kan posta data
  const result = await ingestNewsItems(body, db)
```

**Risk:**
- Öppet för spam och missbruk
- Kan överbelastas med falsk data
- Ingen rate limiting

**Jämför med:** `/app/api/workflows/route.ts` som HAR korrekt API-key validering.

**Rekommenderad åtgärd:** Lägg till samma `verifyApiKey()` check som workflows-endpoint har.

```typescript
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  // ✅ Verifiera API-key
  if (!verifyApiKey(request)) {
    return unauthorizedResponse()
  }

  const result = await ingestNewsItems(body, db)
  // ...
}
```

---

#### 4. DELETE /api/news-items saknar ägarskapsvalidering
**Fil:** `/app/api/news-items/route.ts` (rad 73-106)

**Problem:** Ingen validering av vem som äger den data som raderas.

```typescript
export async function DELETE(request: NextRequest) {
  // ❌ Vem som helst kan radera vad som helst
  const deleted = await db.deleteNewsItem(dbId)
```

**Risk:**
- Användare kan radera andras nyheter
- Potential för dataverlust

**Notering:** Detta är extra problematiskt eftersom `deleteNewsItem` raderar från BÅDE `news_items` OCH `column_data` tabeller (rad 258-293 i db-postgresql.ts), vilket påverkar flera användares dashboards.

**Rekommenderad åtgärd:**
```typescript
export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dbId = searchParams.get('dbId')

  if (!dbId) {
    return NextResponse.json({ error: 'dbId is required' }, { status: 400 })
  }

  // Hämta news item och verifiera att användaren äger en dashboard som innehåller den
  const newsItem = await db.getNewsItemByDbId(dbId)
  if (!newsItem) {
    return NextResponse.json({ error: 'News item not found' }, { status: 404 })
  }

  // Kontrollera om användaren äger någon dashboard med en kolumn som innehåller denna nyhet
  const userDashboards = await db.getDashboardsByCreator(session.user.email)
  const userColumnIds = userDashboards.flatMap(d => d.columns.map(c => c.id))

  const columnData = await db.getColumnDataForNewsItem(dbId)
  const canDelete = columnData.some(cd => userColumnIds.includes(cd.columnId))

  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const deleted = await db.deleteNewsItem(dbId)
  // ...
}
```

**Alternativ:** Gör detta endpoint endast tillgängligt för admin/API-key användning.

---

#### 5. Brist på data validation i updateDashboard
**Fil:** `/lib/db-postgresql.ts` (rad 499-539)

```typescript
const updated = { ...existing, ...updates }  // ❌ Ingen validering av updates
```

**Problem:** Client kan skicka vilket fält som helst i updates objektet, inklusive att ändra `createdBy`, `id`, etc.

**Rekommenderad åtgärd:** Whitelist tillåtna fält:
```typescript
updateDashboard: async (dashboardId: string, updates: Partial<Dashboard>) => {
  const pool = getPool()

  try {
    const existing = await persistentDb.getDashboard(dashboardId)
    if (!existing) {
      return null
    }

    // ✅ Whitelist endast tillåtna fält
    const allowedUpdates = ['name', 'slug', 'description', 'columns', 'viewCount', 'lastViewed']
    const safeUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => ({ ...obj, [key]: updates[key] }), {})

    const updated = { ...existing, ...safeUpdates }

    // Rest av logiken...
  }
}
```

---

### 🟡 VIKTIGT - Auktorisering och datahantering

#### 6. Inkonsekvent autentiseringsstrategi
**Problem:** Blandning av API-key auth och session-based auth utan tydlig policy.

**Nuvarande tillstånd:**
- `/api/workflows` - ✅ Kräver API-key
- `/api/news-items POST` - ❌ Ingen auth
- `/api/columns/[id] GET` - ✅ Kräver API-key
- `/api/columns/[id] PUT/DELETE` - ✅ Kräver session
- `/api/dashboards/[slug] PUT` - ❌ Ingen ägarskapsvalidering

**Rekommendation:** Definiera tydliga autentiseringsnivåer:

1. **Externa workflows (write)** → API-key required
2. **Intern UI (read)** → Session optional (publika dashboards)
3. **Intern UI (write/modify)** → Session required + ownership validation
4. **Admin operations** → Session required + admin role check

**Implementationsförslag:**
```typescript
// lib/auth-helpers.ts
export const requireApiKey = (request: NextRequest) => {
  if (!verifyApiKey(request)) {
    throw new Error('API key required')
  }
}

export const requireSession = async () => {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Authentication required')
  }
  return session
}

export const requireOwnership = async (resourceCreatedBy: string, session: any) => {
  if (resourceCreatedBy !== session.user.email) {
    throw new Error('Forbidden - you do not own this resource')
  }
}
```

---

#### 7. Brist på dashboard-radering endpoint
**Problem:** Det finns ingen säker metod för användare att radera sina egna dashboards.

**Saknas:**
- `DELETE /api/dashboards/[slug]` endpoint
- Validering av ägarskap före radering
- Cascade-logik för att rensa kolumner och följare

**Rekommenderad implementation:**
```typescript
// /app/api/dashboards/[slug]/route.ts
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const params = await context.params
  const slug = params.slug

  const dashboard = await db.getDashboardBySlug(slug)
  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  // Verifiera ägarskap
  if (dashboard.createdBy !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Radera dashboard (följare raderas automatiskt via CASCADE i SQL)
  const deleted = await db.deleteDashboard(dashboard.id)

  return NextResponse.json({
    success: true,
    message: 'Dashboard deleted successfully'
  })
}
```

**Databas-implementation:**
```typescript
// lib/db-postgresql.ts
deleteDashboard: async (dashboardId: string) => {
  const pool = getPool()

  try {
    await pool.query('BEGIN')

    // Radera dashboard (CASCADE tar hand om user_dashboard_follows)
    const result = await pool.query(
      'DELETE FROM dashboards WHERE id = $1 RETURNING *',
      [dashboardId]
    )

    await pool.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }
}
```

**SQL Schema-uppdatering behövs:**
```sql
-- Lägg till CASCADE för columns
ALTER TABLE dashboards
  DROP CONSTRAINT IF EXISTS dashboards_columns_fk;

-- Skapa tabell för columns istället för JSONB (bättre approach)
CREATE TABLE dashboard_columns (
  id UUID PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  flow_id UUID
);
```

---

#### 8. Potentiell N+1 query i GET /api/dashboards
**Fil:** `/app/api/dashboards/route.ts` (rad 27-39)

```typescript
const enrichedDashboards = await Promise.all(
  filteredDashboards.map(async dashboard => {
    const followers = await db.getDashboardFollowers(dashboard.id) // ❌ N+1 query
    return { ...dashboard, followerCount: followers.length, ... }
  })
)
```

**Problem:** För 50 dashboards = 50 separata databasfrågor.

**Lösning:** Implementera batch query:
```typescript
// I db-postgresql.ts
getAllDashboardsWithFollowerCounts: async () => {
  const pool = getPool()

  const result = await pool.query(`
    SELECT
      d.id,
      d.name,
      d.slug,
      d.description,
      d.columns,
      d.created_at as "createdAt",
      d.created_by as "createdBy",
      d.created_by_name as "createdByName",
      d.view_count as "viewCount",
      d.last_viewed as "lastViewed",
      d.is_default as "isDefault",
      COUNT(DISTINCT f.user_id)::int as "followerCount"
    FROM dashboards d
    LEFT JOIN user_dashboard_follows f ON d.id = f.dashboard_id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `)

  return result.rows
}

// Användning i API:
const dashboards = await db.getAllDashboardsWithFollowerCounts()
```

---

#### 9. Race condition i column data sync
**Fil:** `/lib/services/ingestion.ts` (rad 226-232)

```typescript
for (const targetColumnId of Array.from(matchingColumns)) {
  const existingItems = await db.getColumnData(targetColumnId) || []
  const combined = [...existingItems, ...validatedItems]
  await db.setColumnData(targetColumnId, combined)  // ❌ Ingen transaktionshantering
  columnsUpdated += 1
}
```

**Problem:** Två samtidiga requests till samma columnId kan orsaka att data försvinner (last write wins).

**Scenario:**
1. Request A läser column data → [item1, item2]
2. Request B läser column data → [item1, item2]
3. Request A skriver → [item1, item2, itemA]
4. Request B skriver → [item1, item2, itemB] ← itemA försvinner!

**Lösning:** Använd databastransaktion och append-only operation:
```typescript
// Uppdatera ingestNewsItems i lib/services/ingestion.ts
for (const targetColumnId of Array.from(matchingColumns)) {
  // Använd append-only insert istället för read-modify-write
  await db.appendToColumnData(targetColumnId, validatedItems)
  columnsUpdated += 1
}

// I db-postgresql.ts
appendToColumnData: async (columnId: string, items: NewsItem[]) => {
  const pool = getPool()

  try {
    await pool.query('BEGIN')

    for (const item of items) {
      await pool.query(
        `INSERT INTO column_data (db_id, column_id, news_item_id, data, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (column_id, news_item_id) DO NOTHING`,
        [uuidv4(), columnId, item.dbId, JSON.stringify(item), new Date().toISOString()]
      )
    }

    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }
}
```

---

#### 10. Saknad index på created_by i dashboards
**Fil:** `migrations/001-add-user-features.sql` (rad 33)

```sql
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
```

**Status:** ✅ Index finns i migration

**Men saknas i:** `init-db.sql` - vilket innebär att fresh installations inte får detta index.

**Rekommendation:** Synka init-db.sql med alla migrations.

```sql
-- Lägg till i init-db.sql efter CREATE TABLE dashboards
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboards_slug ON dashboards(slug);
```

---

### 🔵 FÖRBÄTTRING - Best practices och teknisk skuld

#### 11. Inkonsekvent error logging
**Problem:** Blandning av `console.error()` och `logger.error()`.

**Exempel:**
- `/app/api/dashboards/route.ts`: Använder `console.error`
- `/app/api/news-items/route.ts`: Använder `logger.error`
- `/app/api/workflows/route.ts`: Använder `logger.error`

**Rekommendation:** Standardisera på `logger` överallt för strukturerad loggning.

```typescript
// Byt ut alla:
console.error('Error fetching dashboards:', error)

// Till:
logger.error('api.dashboards.fetchError', { error })
```

---

#### 12. Saknad input sanitization
**Problem:** User input (namn, beskrivningar) sanitizeras inte för XSS.

**Exempel:** Dashboard/kolumn-namn och beskrivningar lagras direkt utan sanitization.

**Risk:**
```typescript
// En användare kan skapa dashboard med namn:
"<script>alert('XSS')</script>"
// Som sedan renderas på andra användares skärmar
```

**Rekommendation:**
```bash
npm install isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify'

// I API endpoints:
const sanitizedName = DOMPurify.sanitize(name.trim())
const sanitizedDescription = description ? DOMPurify.sanitize(description.trim()) : undefined
```

---

#### 13. Saknad rate limiting
**Problem:** Inga begränsningar på API-anrop, särskilt för:
- `/api/news-items POST` - Kan spammas med data
- `/api/dashboards POST` - Kan skapa oändligt många dashboards
- `/api/dashboards/[slug]/follow` - Kan spamma follow/unfollow

**Rekommendation:** Implementera middleware med rate limiting.

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
})

// Användning i API:
export async function POST(request: NextRequest) {
  const ip = request.ip ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // ... rest of endpoint
}
```

---

#### 14. Column data duplication
**Observation:** Data lagras både i `news_items` (global) OCH `column_data` (per kolumn).

**Current flow:**
1. Workflow postar data → `news_items` tabell
2. Ingestion service kopierar till `column_data` för varje matchande kolumn
3. Frontend hämtar från `column_data`

**Problem med nuvarande approach:**
- Data duplicering (om en nyhet matchar 5 kolumner = 5 kopior i column_data)
- Riskfaktorer vid delete (måste synka båda tabeller)
- Inkonsistent state om en operation misslyckas

**Bättre alternativ:**
```sql
-- Behåll endast news_items, skippa column_data helt
-- Lägg till mapping-tabell istället:
CREATE TABLE column_news_mappings (
  column_id UUID NOT NULL,
  news_item_db_id VARCHAR(255) NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (column_id, news_item_db_id),
  FOREIGN KEY (news_item_db_id) REFERENCES news_items(db_id) ON DELETE CASCADE
);

CREATE INDEX idx_column_news_mappings_column ON column_news_mappings(column_id);
CREATE INDEX idx_column_news_mappings_added_at ON column_news_mappings(added_at);

-- Query för att hämta kolumndata:
SELECT n.*
FROM news_items n
INNER JOIN column_news_mappings m ON n.db_id = m.news_item_db_id
WHERE m.column_id = $1
ORDER BY n.created_in_db DESC
LIMIT 100;
```

**Fördelar:**
- Eliminerar duplicering
- Bättre referential integrity (CASCADE fungerar korrekt)
- Lättare att underhålla
- Enklare att implementera pagination

**Migration:**
```typescript
// Migration för att flytta från column_data till mappings
async function migrateToMappings() {
  // 1. Hämta all column_data
  const columnData = await pool.query('SELECT * FROM column_data')

  // 2. Skapa mappings
  for (const row of columnData.rows) {
    await pool.query(
      'INSERT INTO column_news_mappings (column_id, news_item_db_id, added_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [row.column_id, row.db_id, row.created_at]
    )
  }

  // 3. Verifiera att allt migrerades korrekt
  // 4. Droppa column_data tabell
}
```

---

#### 15. Saknad soft delete för dashboards
**Problem:** Om en användare av misstag raderar en dashboard finns ingen undo-funktion.

**Rekommendation:** Lägg till soft delete:
```sql
ALTER TABLE dashboards
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by VARCHAR(255);

-- Vid queries: WHERE deleted_at IS NULL
-- Vid "radering": UPDATE dashboards SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2
```

**Implementation:**
```typescript
// db-postgresql.ts
softDeleteDashboard: async (dashboardId: string, deletedBy: string) => {
  const pool = getPool()

  const result = await pool.query(
    `UPDATE dashboards
     SET deleted_at = NOW(), deleted_by = $1
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [deletedBy, dashboardId]
  )

  return result.rows[0]
}

restoreDashboard: async (dashboardId: string) => {
  const pool = getPool()

  const result = await pool.query(
    `UPDATE dashboards
     SET deleted_at = NULL, deleted_by = NULL
     WHERE id = $1
     RETURNING *`,
    [dashboardId]
  )

  return result.rows[0]
}

// Uppdatera alla queries att filtrera bort soft-deleted:
getDashboards: async () => {
  const result = await pool.query(
    'SELECT * FROM dashboards WHERE deleted_at IS NULL ORDER BY created_at DESC'
  )
  return result.rows
}
```

---

#### 16. Saknad default limits på queries
**Problem:** Vissa queries kan returnera tusentals rader utan begränsning.

**Exempel:**
```typescript
getColumnData: async (columnId: string) => {
  // ❌ Kan returnera 10000+ items om kolumnen har mycket data
  const result = await pool.query(
    'SELECT * FROM column_data WHERE column_id = $1',
    [columnId]
  )
  return result.rows
}
```

**Rekommendation:** Lägg till default limits:
```typescript
getColumnData: async (columnId: string, limit = 100, offset = 0) => {
  const result = await pool.query(
    `SELECT * FROM column_data
     WHERE column_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [columnId, limit, offset]
  )

  return result.rows
}
```

---

## Datamodell & Konsistens-analys

### ✅ Bra design-beslut:

1. **UUID för columns** - Bra separation mellan user-facing namn och systemidentifierare
2. **Slug system** - SEO-vänliga URLs med fallback till legacy IDs
3. **Foreign keys** - Korrekt användning i user_dashboard_follows och user_preferences
4. **JSON columns** - Flexibel lagring av location och extra-fält
5. **Timestamp tracking** - createdInDb vs timestamp separation är smart för verklig analys
6. **Connection pooling** - Konfigurerad med max 20 connections
7. **Indexes** - Bra grundläggande indexes på workflow_id, timestamp, news_value

### ⚠️ Förbättringsområden:

1. **ON DELETE CASCADE** saknas för dashboards → columns relation
2. **Unique constraint** saknas på `dashboards.slug` (finns i SQL men inte enforced korrekt i kod)
3. **Columns som JSONB** - Bör vara egen tabell för bättre relational integrity
4. **Data duplicering** - column_data duplicerar news_items data

---

## API Design-analys

### ✅ Konsistenta mönster:

1. Standardiserat response-format: `{ success: true, ... }` eller `{ error: "..." }`
2. Async params-hantering för Next.js 15
3. Tydlig separation mellan slug-based och ID-based routing
4. Structured logging med context
5. Transaction-hantering i kritiska operationer

### ⚠️ Inkonsektensar:

1. **Query parameters:**
   - `/api/dashboards?mine=true` (bra)
   - `/api/columns/[id]/archive?dashboardId=x` (dåligt - borde vara i body eller path)

2. **Authentication strategy:** Blandning av API-key och session-based auth utan tydlig policy

3. **Endpoint-namngivning:**
   - `/api/dashboards/[slug]` - Använder slug
   - `/api/columns/[id]` - Använder UUID
   - `/api/news-items` - Använder dbId i body vid DELETE

   **Rekommendation:** Konsistent användning av identifierare i URL path.

4. **Error responses:**
   - Vissa endpoints: `{ error: 'Message' }`
   - Andra endpoints: `{ success: false, error: 'Message' }`

   **Rekommendation:** Standardisera error format.

---

## Skalbarhet & Prestanda

### ✅ Bra prestanda-beslut:

1. **Connection pooling** - Pool configurerad med max 20 connections
2. **Indexes** - Bra grundläggande indexes på workflow_id, timestamp, news_value
3. **Pagination support** - `getNewsItemsPaginated()` finns men används inte överallt
4. **Memoization i frontend** - MainDashboard använder useMemo för column data
5. **Batch operations** - Promise.all används för parallella operationer

### ⚠️ Prestandarisker:

1. **N+1 query** - Problem #8 ovan
2. **Ingen caching** - Varje request = databas query (överväg Redis för read-heavy endpoints)
3. **JSON parsing overhead** - `JSON.parse()` på varje rad i flera queries
4. **Saknad LIMIT på column queries** - getColumnData() kan returnera tusentals rader
5. **Data duplicering** - column_data approach ökar databasstorlek

**Rekommendationer:**

1. **Redis caching för dashboards:**
```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function getCachedDashboard(slug: string) {
  const cached = await redis.get(`dashboard:${slug}`)
  if (cached) return cached

  const dashboard = await db.getDashboardBySlug(slug)
  await redis.set(`dashboard:${slug}`, dashboard, { ex: 300 }) // 5 min cache
  return dashboard
}
```

2. **JSONB direkt i queries:**
```typescript
// Istället för JSON.parse() i kod, använd PostgreSQL's JSONB operators
const result = await pool.query(`
  SELECT
    id,
    workflow_id,
    data->>'title' as title,
    data->>'description' as description,
    (data->>'newsValue')::int as news_value
  FROM column_data
  WHERE column_id = $1
  LIMIT 100
`)
```

---

## Error Handling-analys

### ✅ Bra hantering:

1. **Transactions** - Använder BEGIN/COMMIT/ROLLBACK korrekt i critical operations
2. **Custom error types** - IngestionError med status codes
3. **Error logging** - Strukturerad loggning med context
4. **HTTP status codes** - Korrekta statuskoder (400, 401, 404, 500)
5. **Try-catch blocks** - Konsekvent användning

### ⚠️ Förbättringspotential:

1. **Database errors exponeras** - Vissa error messages kan läcka databasstruktur
2. **Saknad retry-logik** - Vid transient errors (network issues, connection timeouts)
3. **Saknad circuit breaker** - Om databasen är nere, fortsätter appen försöka
4. **Inkonsekvent error messages** - Blandning av svenska och engelska

**Rekommendationer:**

1. **Sanitera error messages i production:**
```typescript
// lib/error-handler.ts
function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof IngestionError) return error.message
  if (error instanceof z.ZodError) return 'Validation error'

  if (process.env.NODE_ENV === 'production') {
    return 'Internal server error'
  }

  return String(error)
}

// Användning:
} catch (error) {
  logger.error('api.dashboards.error', { error })
  return NextResponse.json(
    { error: sanitizeErrorMessage(error) },
    { status: 500 }
  )
}
```

2. **Retry-logik för databas-operationer:**
```typescript
// lib/db-retry.ts
async function retryQuery<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      if (!isRetryableError(error)) throw error

      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}

function isRetryableError(error: unknown): boolean {
  const message = String(error).toLowerCase()
  return (
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('econnrefused')
  )
}
```

---

## Säkerhets-checklista

### 🔴 Kritiska brister:
- [ ] Dashboard PUT endpoint saknar ägarskapsvalidering
- [ ] Column archive/restore saknar autentisering
- [ ] News items POST saknar API-key
- [ ] News items DELETE saknar ägarskapsvalidering
- [ ] Dashboard updates saknar input whitelist

### 🟡 Viktiga förbättringar:
- [ ] Inkonsekvent autentiseringsstrategi
- [ ] Dashboard DELETE endpoint saknas
- [ ] N+1 query i dashboard listing
- [ ] Race condition i column sync
- [ ] Error logging ej standardiserat

### 🔵 Best practices:
- [ ] Input sanitization (XSS protection)
- [ ] Rate limiting
- [ ] Soft delete för dashboards
- [ ] Default query limits
- [ ] Caching layer
- [ ] Retry-logik för databas

---

## Positiva observationer

### 🎉 Vad fungerar bra:

1. **Strukturerad databas-logik** - Tydlig separation mellan db layer och API layer
2. **TypeScript types** - Konsekvent användning av interfaces
3. **Migration system** - Bra separation av migrations från init schema
4. **Ingestion service** - Väl strukturerad med tydlig separation of concerns
5. **Flexible payload handling** - Hanterar olika payload-format från workflows
6. **Audit trail börjar ta form** - createdBy, createdByName, followedAt timestamps
7. **Follow/unfollow system** - Bra implementation av many-to-many relation
8. **Slug generation** - Automatisk generering med unique checks
9. **Default dashboard concept** - Bra fallback för main-dashboard
10. **Connection string parsing** - Stöd för både standard och Cloud SQL Unix sockets
11. **Transaction-hantering** - BEGIN/COMMIT/ROLLBACK används korrekt
12. **Structured logging** - Bra foundation med logger-systemet
13. **API-key auth** - Korrekt implementation i workflows endpoint
14. **Type safety** - NewsItem interface är väldefinierad och konsekvent
15. **Error boundaries** - Try-catch blocks används konsekvent

---

## Konkret handlingsplan

### Fas 1: KRITISKA säkerhetsfixar (implementera OMEDELBART före production)

**Prioritet: 🔴 AKUT**
**Estimerad tid:** 1-2 dagar

1. **Lägg till ägarskapsvalidering i PUT /api/dashboards/[slug]**
   - Fil: `/app/api/dashboards/[slug]/route.ts`
   - Verifiera `session.user.email === dashboard.createdBy`
   - Returnera 403 Forbidden om ej ägare

2. **Lägg till autentisering + ägarskap i column endpoints**
   - Filer: `/app/api/columns/[id]/archive/route.ts`, `restore/route.ts`, `archived/route.ts`
   - Verifiera session och att kolumnen tillhör användarens dashboard
   - Returnera 401 Unauthorized om ej inloggad, 403 om ej ägare

3. **Lägg till API-key auth i POST /api/news-items**
   - Fil: `/app/api/news-items/route.ts`
   - Använd samma `verifyApiKey()` som workflows
   - Returnera 401 om API-key saknas/ogiltig

4. **Implementera ägarskapsvalidering i DELETE /api/news-items**
   - Fil: `/app/api/news-items/route.ts`
   - Verifiera att användaren äger dashboarden som innehåller kolumnen som innehåller nyheten
   - ELLER: Gör detta endpoint endast tillgängligt för API-key användning

5. **Input validation whitelist i updateDashboard**
   - Fil: `/lib/db-postgresql.ts`
   - Whitelist endast tillåtna fält som får uppdateras (name, slug, description, columns)
   - Förhindra uppdatering av id, createdBy, etc.

**Acceptance criteria:**
- Alla endpoints har korrekt autentisering
- Ägarskapsvalidering finns där det behövs
- Security tests passerar
- Dokumenterad autentiseringsstrategi

---

### Fas 2: VIKTIGA förbättringar (före production launch)

**Prioritet: 🟡 HÖG**
**Estimerad tid:** 3-4 dagar

6. **Implementera DELETE /api/dashboards/[slug]**
   - Med ägarskapsvalidering och cascade-logik
   - Soft delete rekommenderas (se problem #15)

7. **Fixa N+1 query i GET /api/dashboards**
   - Batch query för follower counts
   - Implementera `getAllDashboardsWithFollowerCounts()`

8. **Lägg till transaktionshantering i column sync**
   - Fil: `/lib/services/ingestion.ts`
   - Använd append-only insert istället för read-modify-write
   - Eliminera race condition risk

9. **Synka init-db.sql med alla migrations**
   - Se till att fresh installations får alla indexes
   - Verifiera att init och migrations ger samma slutresultat

10. **Standardisera error logging**
    - Ersätt alla `console.error` med `logger.error`
    - Konsekvent logging-format

11. **Implementera rate limiting**
    - Särskilt för POST endpoints
    - @upstash/ratelimit eller liknande

**Acceptance criteria:**
- Dashboard deletion fungerar korrekt
- Performance-tester visar förbättring
- Transaktionell integritet garanterad
- Konsekvent logging överallt

---

### Fas 3: Best practices & polish (efter launch, ongoing)

**Prioritet: 🔵 MEDIUM**
**Estimerad tid:** 1-2 veckor (kan spridas ut över tid)

12. **Refaktorera column_data till mapping table**
    - Eliminera data duplicering
    - Bättre referential integrity
    - Migration från befintlig data

13. **Lägg till input sanitization (XSS protection)**
    - DOMPurify för user-generated content
    - Sanitera namn, beskrivningar, etc.

14. **Implementera soft delete för dashboards**
    - Möjliggör undo-funktion
    - deleted_at och deleted_by kolumner

15. **Lägg till default limits på queries**
    - Förhindra accidental full-table scans
    - Default limit 100 för column queries

16. **Implementera caching layer**
    - Redis för frequently accessed data
    - Cache dashboards, följare, etc.

17. **Förbättra error messages**
    - Sanitera errors i production
    - Konsekvent svenska eller engelska

18. **Databas-optimeringar**
    - Flytta columns från JSONB till egen tabell
    - ON DELETE CASCADE för alla relations
    - Unique constraints

**Acceptance criteria:**
- Ingen data duplicering
- XSS-skydd på plats
- Bättre prestanda med caching
- User-friendly error messages

---

## Teknisk skuld-register

### Hög prioritet:
1. Data duplicering i column_data (bör migreras till mapping table)
2. Columns som JSONB istället för egen tabell
3. Inkonsekvent autentiseringsstrategi
4. Saknad CASCADE constraints

### Medel prioritet:
5. Ingen caching layer
6. JSON parsing overhead
7. Mixed svenska/engelska i kod och errors
8. Saknad retry-logik

### Låg prioritet:
9. Ingen circuit breaker pattern
10. Mixed console.error/logger.error
11. Saknad monitoring/metrics
12. Ingen admin UI

---

## Rekommenderade verktyg & bibliotek

### Säkerhet:
- `@upstash/ratelimit` - Rate limiting
- `isomorphic-dompurify` - XSS protection
- `zod` - Schema validation (för input validation)

### Performance:
- `@upstash/redis` - Caching layer
- `@vercel/analytics` - Performance monitoring
- `pg-query-stream` - Streaming large result sets

### Developer experience:
- `eslint-plugin-security` - Security linting
- `jest` - Testing framework
- `@faker-js/faker` - Test data generation

---

## Sammanfattning

**Övergripande status:** Din arkitektur har en **solid grund** men **kritiska säkerhetshål** som måste åtgärdas före production. Övergången från POC till multi-user har introducerat autentiserings- och auktoriseringsproblem som inte är ovanliga i snabb utveckling.

### Styrkor:
- ✅ Tydlig separation of concerns
- ✅ Bra databasdesign med appropriate normalization
- ✅ Flexibel ingestion-pipeline
- ✅ TypeScript types och type safety
- ✅ Structured logging foundation
- ✅ Transaction-hantering
- ✅ Connection pooling

### Svagheter:
- ❌ Inkonsekvent auktorisering (största problemet)
- ❌ Saknad ownership validation på kritiska endpoints
- ❌ N+1 query performance issues
- ❌ Data duplication i column_data approach
- ❌ Ingen rate limiting

### Rekommendation:

1. **Implementera Fas 1 (säkerhet) OMEDELBART** - Cirka 1-2 dagars arbete
2. **Lägg till comprehensive tests** - Särskilt för authorization
3. **Security audit** - Gå igenom alla API endpoints med checklist
4. **Överväg middleware layer** - För common authorization patterns

### Är arkitekturen räddningsbar?

✅ **Absolut!** Problemen är isolerade och kan fixas inkrementellt. Grundstrukturen är sund och väl genomtänkt. Med de föreslagna fixarna kommer systemet vara production-ready.

### Nästa steg:

1. **Review denna rapport** med teamet
2. **Prioritera fixes** baserat på er timeline
3. **Börja med Fas 1** - säkerhetsfixar
4. **Skriv tests** för nya authorization-logik
5. **Deploy och övervaka** - Se till att logga ordentligt

---

**Rapport skapad:** 2025-10-01
**Analyserad av:** Backend Architecture Advisor Agent
**Kontakta:** För frågor eller ytterligare analys
