# NewsDeck - Komplett Granskning för Produktionslansering

**Datum:** 2025-10-19
**Syfte:** Förberedelse för lansering till hundratals användare
**Status:** 🟡 Behöver åtgärder innan lansering

---

## Sammanfattning

NewsDeck-applikationen har en solid teknisk grund men **kräver viktiga åtgärder** innan produktionslansering till hundratals användare. Denna rapport identifierar kritiska säkerhets-, prestanda- och dokumentationsproblem som måste åtgärdas.

### Kritiska fynd
- ⛔ **Säkerhet:** Ingen rate limiting implementerad
- ⛔ **Säkerhet:** Endast en global API-nyckel (ingen per-klient isolation)
- ⛔ **Dokumentation:** Allvarliga motsägelser mellan dokumentation och verklighet
- ⚠️ **Prestanda:** Inga caching-mekanismer för läsoperationer
- ⚠️ **Monitorering:** Brist på strukturerad loggning och alerting
- ⚠️ **Testning:** Minimal testtäckning (endast 1 testfil)

---

## 🔴 KRITISKA PROBLEM (Måste fixas före lansering)

### 1. Säkerhet: Ingen Rate Limiting

**Problem:**
API-endpoints saknar helt rate limiting. En enskild klient kan överbelasta systemet med obegränsade requests.

**Berörd endpoint:** `/api/workflows` (huvudingestion)

**Risk:**
- DDoS-attack från komprometterad workflow
- Oavsiktlig överbelastning från buggy integration
- Kostnadsexplosion (Cloud Run fakturerar per request)
- Database connection pool exhaustion

**Lösning:**
```typescript
// Rekommenderad implementation med Upstash Rate Limit eller Redis
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minut
  analytics: true,
})

// I /api/workflows/route.ts
const identifier = ipAddress || apiKeyHash
const { success, limit, remaining } = await ratelimit.limit(identifier)

if (!success) {
  return NextResponse.json(
    { error: "Rate limit exceeded. Max 100 requests per minute." },
    { status: 429 }
  )
}
```

**Estimerad tid:** 4-6 timmar
**Prioritet:** 🔴 KRITISK

---

### 2. Säkerhet: Single API Key Architecture

**Problem:**
Endast en global API_KEY för alla workflow-klienter. Ingen möjlighet att:
- Spåra vilken workflow/klient som skickar vilka requests
- Revoke access för en specifik komprometterad integration
- Sätta olika rate limits per klient
- Audit trail per klient

**Nuvarande kod (`lib/api-auth.ts`):**
```typescript
export function verifyApiKey(request: NextRequest): boolean {
  const apiKey = process.env.API_KEY  // ← En nyckel för alla
  // ...
}
```

**Lösning:**
Implementera API key management:

```typescript
// Databas-schema
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT UNIQUE NOT NULL,  -- bcrypt hash
  name TEXT NOT NULL,              -- "Workflow Breaking News"
  workflow_id TEXT,                -- Koppla till specifik workflow
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 100
);

// Admin endpoint för att generera nycklar
POST /api/admin/api-keys
DELETE /api/admin/api-keys/:id
GET /api/admin/api-keys (lista aktiva nycklar)
```

**Estimerad tid:** 8-12 timmar
**Prioritet:** 🔴 KRITISK

---

### 3. Dokumentation: AGENTS.md Fullständigt Föråldrad

**Problem:**
`AGENTS.md` innehåller **farligt vilseledande information** som direkt motsäger faktisk implementation:

**AGENTS.md säger:**
```markdown
- db-persistent.ts - Vercel KV (Redis) storage implementation
- db-upstash.ts - Alternative Upstash Redis implementation
- Production: Uses Vercel KV (Redis) for persistence
- Deployment: Designed for Vercel deployment
```

**VERKLIGHET:**
```markdown
✅ Använder PostgreSQL (Cloud SQL) i produktion
✅ Deployas till Google Cloud Run (INTE Vercel)
✅ db-persistent.ts existerar INTE
✅ db-upstash.ts existerar INTE
```

**Konsekvens:**
- Nya utvecklare kommer bli förvirrade
- Onboarding-tid ökar dramatiskt
- Risk för felaktiga arkitekturbeslut

**Åtgärd:**
```bash
# Alternativ 1: Radera
rm AGENTS.md

# Alternativ 2: Arkivera
mkdir -p docs/archive
git mv AGENTS.md docs/archive/AGENTS-OBSOLETE-2024.md
```

**Estimerad tid:** 15 minuter
**Prioritet:** 🔴 KRITISK (före onboarding av nya utvecklare)

---

### 4. Duplicate File: claude.md vs CLAUDE.md

**Problem:**
Två identiska filer existerar (case-sensitivity):
- `/CLAUDE.md` (453 rader)
- `/claude.md` (453 rader, MD5: b658b0d7f6f52e05c0e45be43145eacd)

På macOS (case-insensitive filesystem) visas båda men är samma fil.
På Linux/Docker (case-sensitive) blir det två separata filer.

**Risk:**
- Git conflicts vid cross-platform development
- Förvirring om vilken som är "korrekt"

**Åtgärd:**
```bash
git rm claude.md
echo "claude.md" >> .gitignore  # Förhindra återkommande problem
git commit -m "Remove duplicate claude.md, keep CLAUDE.md"
```

**Estimerad tid:** 5 minuter
**Prioritet:** 🟡 VIKTIGT

---

## 🟡 VIKTIGA FÖRBÄTTRINGAR (Rekommenderat före lansering)

### 5. Monitorering: Brist på Error Tracking

**Problem:**
- Endast 110 `console.log/error` statements
- Ingen integration med error tracking (Sentry, etc.)
- Ingen structured logging
- Svårt att diagnostisera produktionsproblem

**Exempel från befintlig kod:**
```typescript
// lib/logger.ts - Nuvarande simplistic logging
export const logger = {
  info: (message: string, meta?: any) =>
    console.log(`[INFO] ${message}`, meta),
  warn: (message: string, meta?: any) =>
    console.warn(`[WARN] ${message}`, meta),
  error: (message: string, meta?: any) =>
    console.error(`[ERROR] ${message}`, meta),
}
```

**Rekommendation:**
Integrera Sentry för production error tracking:

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filtrera bort känslig data
    if (event.request?.headers?.['x-api-key']) {
      event.request.headers['x-api-key'] = '[REDACTED]'
    }
    return event
  }
})
```

**Estimerad tid:** 3-4 timmar
**Prioritet:** 🟡 VIKTIGT

---

### 6. Prestanda: Saknar Caching Layer

**Problem:**
Varje dashboard-load gör:
- `SELECT * FROM dashboards WHERE slug = ?`
- `SELECT * FROM column_data WHERE column_id IN (...)`
- Upprepad data för varje användare, ingen caching

För 100+ samtidiga användare → onödig databas-load.

**Lösning:**
Implementera Redis cache för läsoperationer:

```typescript
// lib/cache.ts
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export async function getCachedDashboard(slug: string) {
  const cached = await redis.get(`dashboard:${slug}`)
  if (cached) return cached

  const dashboard = await db.getDashboard(slug)
  await redis.set(`dashboard:${slug}`, dashboard, { ex: 60 }) // 60s TTL
  return dashboard
}

// Invalidera cache vid updates
export async function invalidateDashboardCache(slug: string) {
  await redis.del(`dashboard:${slug}`)
}
```

**Estimerad tid:** 6-8 timmar
**Prioritet:** 🟡 VIKTIGT (för 100+ users)

---

### 7. CI/CD: Vercel Referenser i GitHub Actions

**Problem:**
CI workflow innehåller Vercel deployment step:

```yaml
# .github/workflows/ci.yml (lines 35-48)
deploy-preview:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'

  steps:
  - name: Deploy to Vercel Preview
    uses: amondnet/vercel-action@v25
    with:
      vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

**Verklighet:** Produktionsdeploy sker till **Google Cloud Run** (`.github/workflows/deploy.yml`)

**Risk:**
- Förvirring om deploy-strategi
- Vercel secrets kan vara utgångna/oanvända

**Åtgärd:**
```yaml
# Ta bort Vercel preview deployment ELLER
# Uppdatera till Cloud Run preview environments
deploy-preview:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'

  steps:
  - name: Deploy Preview to Cloud Run
    run: |
      gcloud run deploy newsdeck-pr-${{ github.event.pull_request.number }} \
        --image=... \
        --region=europe-west1 \
        --no-allow-unauthenticated  # ← Require auth for previews
```

**Estimerad tid:** 2-3 timmar
**Prioritet:** 🟡 VIKTIGT

---

### 8. Dependencies: @vercel/kv Oanvänd

**Problem:**
`package.json` innehåller `@vercel/kv: ^3.0.0` trots att den inte används:

```bash
$ grep -r "@vercel/kv" --include="*.ts" --include="*.tsx"
# → Inga resultat (endast i node_modules)
```

**Åtgärd:**
```bash
npm uninstall @vercel/kv
git add package.json package-lock.json
git commit -m "Remove unused @vercel/kv dependency"
```

**Estimerad tid:** 5 minuter
**Prioritet:** 🟢 LÅGT (städning)

---

## 🟢 REKOMMENDATIONER (Bra att ha)

### 9. Testning: Minimal Coverage

**Status:**
- Endast 1 testfil: `tests/ingestion.test.ts`
- Inga komponententester
- Inga integrationstester för API endpoints

**Rekommendation:**
Lägg till kritiska tester innan skalning:

```typescript
// tests/api/workflows.test.ts
describe('POST /api/workflows', () => {
  test('rejects requests without API key', async () => {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ workflowId: 'test', items: [] })
    })
    expect(response.status).toBe(401)
  })

  test('accepts valid payload with columnId', async () => {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'x-api-key': process.env.API_KEY },
      body: JSON.stringify({
        columnId: 'col-test',
        items: [{ title: 'Test', source: 'test', newsValue: 3, timestamp: new Date().toISOString() }]
      })
    })
    expect(response.status).toBe(200)
  })
})
```

**Estimerad tid:** 12-16 timmar (setup + critical tests)
**Prioritet:** 🟡 VIKTIGT

---

### 10. Städning: Screenshots och Temporary Files

**Fynd:**
- `/Skärmavbild 2025-10-16 kl. 23.27.13.png` (4.1 MB)
- `/test-refactor.sh` (testing script)

**Åtgärd:**
```bash
# Ta bort screenshot
git rm "Skärmavbild 2025-10-16 kl. 23.27.13.png"

# Uppdatera .gitignore
cat >> .gitignore << 'EOF'

# Screenshots and temporary images
*.png
*.jpg
*.jpeg
*.gif
Skärmavbild*
Screenshot*
EOF

# Arkivera test script om refactoring är klar
git rm test-refactor.sh  # ELLER: git mv test-refactor.sh docs/archive/
```

**Estimerad tid:** 10 minuter
**Prioritet:** 🟢 LÅGT

---

### 11. Dokumentation: README.md SSE-referenser

**Problem:**
README.md refererar till Server-Sent Events (SSE) på flera ställen trots att systemet använder **long-polling + Pub/Sub**.

**Felaktiga rader i README.md:**
- Line 12: "⚡ Real-time Updates: Server-Sent Events (SSE)"
- Line 134: "│   ├── events.ts # Server-Sent Events"
- Line 145: "Real-time: Server-Sent Events (SSE)"
- Line 260: "✅ Real-time updates via Server-Sent Events (SSE)"

**Korrekt beskrivning:**
```markdown
⚡ Real-time Updates: Long-polling + Google Cloud Pub/Sub

Implementation:
- Primary: Google Cloud Pub/Sub push notifications
- Fallback: Long-polling (30s intervals) via /api/columns/[id]/updates
- Deduplication: Client-side via dbId comparison
```

**Estimerad tid:** 30 minuter
**Prioritet:** 🟡 VIKTIGT

---

## 📊 PRODUKTIONSBEREDSKAP: CHECKLISTA

### Säkerhet
- [ ] ⛔ Implementera rate limiting (Redis/Upstash)
- [ ] ⛔ Migrera till multi-tenant API keys (databas-baserat)
- [ ] ⚠️ Lägg till CORS-konfiguration för produktionsdomäner
- [ ] ⚠️ Implementera IP whitelisting för admin-endpoints
- [ ] ⚠️ Skanna dependencies för säkerhetshål (`npm audit`)

### Prestanda
- [ ] ⚠️ Implementera Redis caching för dashboards
- [ ] ⚠️ Optimera database queries (EXPLAIN ANALYZE)
- [ ] 🟢 Lägg till database connection pooling config
- [ ] 🟢 Implementera CDN för statiska assets

### Monitorering
- [ ] ⚠️ Integrera Sentry för error tracking
- [ ] ⚠️ Sätt upp Google Cloud Monitoring alerts
- [ ] ⚠️ Implementera health check endpoint (`/api/health`)
- [ ] 🟢 Lägg till metrics export (Prometheus format)

### Testning
- [ ] ⚠️ Skriv API endpoint tests (workflows, columns, dashboards)
- [ ] 🟢 Lägg till E2E tests för kritiska flöden
- [ ] 🟢 Implementera load testing (k6 eller Apache Bench)

### Dokumentation
- [ ] ⛔ Radera eller arkivera AGENTS.md
- [ ] ⛔ Ta bort duplicate claude.md
- [ ] ⚠️ Uppdatera README.md (SSE → long-polling)
- [ ] ⚠️ Uppdatera DEPLOYMENT.md (ta bort Vercel confusion)
- [ ] 🟢 Skapa API documentation (OpenAPI/Swagger)

### Städning
- [ ] 🟢 Ta bort @vercel/kv dependency
- [ ] 🟢 Radera screenshot-filer
- [ ] 🟢 Uppdatera .gitignore (images, temp files)
- [ ] 🟢 Arkivera test-refactor.sh

### CI/CD
- [ ] ⚠️ Ta bort eller uppdatera Vercel preview deployment
- [ ] ⚠️ Lägg till database migration step i deploy
- [ ] 🟢 Implementera rollback-strategi
- [ ] 🟢 Sätt upp staging environment

---

## 🎯 REKOMMENDERAD IMPLEMENTATIONSORDNING

### Fas 1: Kritiska Säkerhetsfixar (Vecka 1)
1. **Rate limiting** (6h) - Förhindra överbelastning
2. **Multi-tenant API keys** (12h) - Client isolation
3. **Radera AGENTS.md + claude.md** (20min) - Dokumentation

**Total tid:** ~2-3 dagar
**Blockers för lansering:** JA

### Fas 2: Monitorering och Stabilitet (Vecka 2)
4. **Sentry integration** (4h) - Error tracking
5. **Redis caching** (8h) - Prestanda för 100+ users
6. **Health checks + alerts** (4h) - Uptime monitoring

**Total tid:** ~2 dagar
**Blockers för lansering:** Nej, men starkt rekommenderat

### Fas 3: Testning och Dokumentation (Vecka 2-3)
7. **API endpoint tests** (16h) - Regression prevention
8. **Uppdatera README/DEPLOYMENT** (2h) - Korrekt info
9. **Load testing** (4h) - Verifiera skalning

**Total tid:** ~3 dagar
**Blockers för lansering:** Nej, men minskar risk

### Fas 4: Städning och Optimering (Efter lansering)
10. **Dependency cleanup** (1h)
11. **File cleanup** (1h)
12. **CI/CD improvements** (4h)

**Total tid:** ~1 dag
**Blockers för lansering:** Nej

---

## 📈 SKALNINGSÖVERVÄGANDEN

### Nuvarande Kapacitet (Estimerad)
- **Database:** Cloud SQL (f1-micro?) → ~100 concurrent connections
- **Cloud Run:** Default → 100 concurrent requests per instance
- **Long-polling:** 30s interval → Max ~200 active pollers per instance

### För 100+ Användare
**Rekommendationer:**
1. ✅ Uppgradera Cloud SQL till `db-n1-standard-1` (minst)
2. ✅ Sätt Cloud Run max instances till `10-20`
3. ✅ Implementera Redis cache (minskar DB load med ~70%)
4. ✅ Överväg WebSocket upgrade (ersätter long-polling)

### För 1000+ Användare
**Ytterligare åtgärder:**
- Read replicas för Cloud SQL
- CDN för statiska assets (Cloud CDN)
- Pub/Sub subscription scaling
- Database query optimering (materialized views)

---

## 💰 KOSTNADSPROJEKTIONER

### Nuvarande Stack (100 användare)
- **Cloud Run:** ~$20-30/månad
- **Cloud SQL (db-f1-micro):** ~$10/månad
- **Pub/Sub:** ~$5/månad
- **Bandwidth:** ~$10/månad
- **Total:** ~$50-60/månad

### Med Rekommenderade Förbättringar (100 användare)
- **Cloud Run:** ~$30-40/månad
- **Cloud SQL (db-n1-standard-1):** ~$50/månad
- **Upstash Redis:** $10/månad (Pro tier)
- **Sentry:** $26/månad (Team plan)
- **Pub/Sub:** ~$10/månad
- **Bandwidth:** ~$15/månad
- **Total:** ~$140-160/månad

### Vid 1000 användare
- **Estimerad kostnad:** $400-600/månad

---

## 📞 KONTAKT OCH NÄSTA STEG

**Rekommenderad Action Plan:**

1. **Omedelbart (Denna vecka):**
   - Implementera rate limiting
   - Radera AGENTS.md och claude.md
   - Sätt upp Sentry

2. **Före lansering (Nästa vecka):**
   - Implementera multi-tenant API keys
   - Lägg till Redis caching
   - Uppdatera kritisk dokumentation

3. **Efter lansering (Löpande):**
   - Expandera testtäckning
   - Optimera queries baserat på verklig användning
   - Städning och CI/CD-förbättringar

**Vill du att jag:**
- [ ] Börjar implementera rate limiting direkt?
- [ ] Skapar en detaljerad implementation guide för multi-tenant API keys?
- [ ] Sätter upp Sentry integration?
- [ ] Skriver API endpoint tests?

**Eller vill du:**
- [ ] Diskutera någon av dessa punkter mer i detalj?
- [ ] Prioritera om listan?
- [ ] Få en tidslinje för implementation?

---

*Genererad: 2025-10-19*
*Granskad av: Claude Code*
*Nästa review: Efter implementering av Fas 1*
