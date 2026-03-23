Context
Newsdeck ska växa till hundratals dashboards och tusentals användare, inklusive TV-skärmar på redaktioner. Befintlig kod har vuxit organiskt och innehåller:

~2 000 rader geo-normaliseringskod som inte längre behövs (Workflows sätter geo-data i förväg)
Vercel KV (kvarlevan från Vercel-eran, ersätts av GCP-tjänster)
Long-polling som inte skalar bra vid hög concurrent load
Loop-INSERTs vid ingestion (N+1-problem)
MainDashboard.tsx är 2 500+ rader med blandade ansvar
ColumnContent definierat inuti parent-komponenten (återskapas vid varje render)

Varje fas är en egen branch och PR. Ingenting mergas som inte är stabilt.

Fas 1 – Städa bort teknisk skuld
Branch: cleanup/remove-vercel-kv-and-geo-normalization
Mål
Ta bort kod som inte längre behövs. Enklare stack, färre underhållspunkter.
Ta bort: Vercel KV

package.json: ta bort @vercel/kv och relaterade paket
Sök efter alla imports av @vercel/kv i hela kodbasen och ta bort dem
Ta bort eventuella env-variabler kopplade till Vercel KV från .env.example

Ta bort: Geo-normalisering i ingestion
Workflows sätter nu countryCode, regionCode, municipalityCode på varje item innan det postas till Newsdeck. Normalisering i Newsdeck är redundant.
Ta bort:

lib/services/ingestion.ts: funktionen normalizeLocationMetadata() (~159 rader) och alla anrop till den
lib/db-postgresql.ts: geoLookup-funktioner (findByName, findMunicipalityByName, isValidRegionCode, findRegionByName) (~164 rader)
lib/services/location-cache.ts (om den finns)
API-routes: app/api/admin/location-cache/ och app/api/admin/location-mappings/
Databastabeller: location_name_mappings, location_normalization_logs (ny migration som droppar dessa)
Datafiler: data/geo/ (72 KB JSON-filer)
Scripts: scripts/import-geo-data.mjs, relaterade geo-scripts

Behåll:

Databastabeller: countries, regions, municipalities (används av filter-UI)
app/api/geo/route.ts (används av useGeoFilters för att visa filter-panel)
lib/dashboard/hooks/useGeoFilters.ts och components/GeoFilterPanel.tsx
Geo-koder på NewsItem-interfacet (countryCode, regionCode, municipalityCode)

Ingestion efter förenkling:
Lita på att inkommande payload har korrekta koder. Validera bara att formaten stämmer (2-bokstavs ISO, 2-siffrig region, 4-siffrig kommun). Logga warning om ogiltigt format, men krascha inte.
Uppdatera: CLAUDE.md – ta bort all dokumentation av geo-normaliseringsflödet
Verifiering

npm run type-check och npm run lint passerar
POST till /api/workflows med korrekt geo-data sparas korrekt
POST utan geo-data sparas utan krasch (tom location ok)
Filter-UI visar fortfarande regioner och kommuner
Inga imports till borttagna moduler kvar


Fas 2 – Frontend-refaktorering
Branch: refactor/frontend-components
Mål
Bryta upp MainDashboard.tsx i komponenter med tydliga ansvar. Fixa ColumnContent-buggen.
Ny filstruktur
components/
  MainDashboard.tsx                  (~200-300 rader, ren orkestrator)

  column/
    ColumnCard.tsx                   (wrapper-div med drag & drop)
    ColumnHeader.tsx                 (view-läge: titel, meny-knapp)
    ColumnEditForm.tsx               (edit-läge: inställningar, kolumn-ID)
    ColumnContent.tsx                (lista med NewsItem + infinite scroll)

  dashboard/
    AddColumnModal.tsx               (skapa ny + återställ-flikar)
    CreateDashboardModal.tsx         (skapa dashboard-formulär)
    DashboardFilterBar.tsx           (sök-input + geo-filter-knapp + badges)
    MobileMenu.tsx                   (hamburger-drawer från vänster)
    MobileColumnActions.tsx          (bottom-sheet med kolumn-åtgärder)
    MobileDragPreview.tsx            (custom drag-preview)

lib/dashboard/hooks/
  useColumnOperations.ts             (addColumn, removeColumn, updateColumn, reorderColumns)
  useClipboard.ts                    (copyToClipboard, copyColumnFeedUrl)
Kritisk fix: ColumnContent
ColumnContent är just nu definierat inuti MainDashboard-funktionskroppen. Det innebär att React skapar en ny komponent-definition vid varje render, vilket tvingar alla ColumnContent-instanser att unmountas och remountas. Flytta till components/column/ColumnContent.tsx som en topnivå-exporterad komponent.
useColumnOperations
Extrahera dessa funktioner från MainDashboard till en ny hook:

addColumn(title, description?, flowId?) – POST /api/columns + PUT dashboard
removeColumn(columnId) – PUT /api/columns/[id]/archive
restoreColumn(columnId) – PUT /api/columns/[id]/restore
updateColumn(columnId, title, description?, flowId?) – PUT /api/columns/[id]
reorderColumns(draggedId, targetId) – PUT dashboard med ny ordning

Hook tar emot dashboard och onDashboardUpdate som parametrar. Returnerar alla funktioner + createdColumnId-state (för bekräftelse-steg efter skapande).
MainDashboard efter refaktorering
Ansvar: orkestrera hooks, hantera modal-state, rendera layout.
Inga API-anrop direkt i komponenten – allt delegerat till hooks.
Verifiering

npm run type-check och npm run lint passerar
Kolumner renderas korrekt på desktop och mobil
Infinite scroll fungerar i ColumnContent
Lägg till kolumn / redigera / arkivera fungerar
Drag & drop fungerar
Mobil-meny och bottom-sheet fungerar


Fas 3 – Batch-INSERTs
Branch: perf/batch-inserts
Mål
Eliminera N+1-problemet vid ingestion. Viktigt när många items postas samtidigt.
Problem
appendColumnDataBatch och setColumnDataBatch i lib/db-postgresql.ts loopar:
typescriptfor (const columnId of columnIds) {
  for (const item of items) {
    await client.query('INSERT INTO column_data ...')
  }
}
10 kolumner × 100 items = 1 000 separata queries i en transaction.
Fix
Bygg en enda INSERT INTO column_data (column_id, news_item_db_id, data) VALUES med alla rader som ett parametriserat anrop:
sqlINSERT INTO column_data (column_id, news_item_db_id, data, created_at)
VALUES ($1,$2,$3,$4), ($5,$6,$7,$8), ...
ON CONFLICT (column_id, news_item_db_id) DO UPDATE SET data = EXCLUDED.data
```

Gör samma optimering för `addNewsItems` om det också är en loop.

### Gräns
PostgreSQL har max ~65 535 parametrar per query. Vid extremt stora batches: chunka i grupper om 1 000 rader.

### Verifiering
- Ingestion av 100 items till 10 kolumner: mät antal DB-queries (ska vara ~2, inte ~1000)
- Korrekthet: alla items sparas, ingenting tappas
- `npm run type-check` passerar

---

## Fas 4 – SSE istället för long-polling
**Branch:** `feature/sse-realtime`

### Mål
Ersätt per-kolumn long-polling med Server-Sent Events. En enda persistent anslutning per klient. Perfekt för TV-skärmar.

### Varför SSE och inte WebSockets
- Vi behöver bara server→klient (unidirektionellt) – SSE räcker
- Inbyggt i alla moderna browsers, ingen extra lib
- Fungerar bra med Cloud Run (streaming responses stöds)
- Enklare att implementera och debugga än WebSockets
- Automatisk reconnect inbyggt i EventSource API

### Ny server-endpoint
**`app/api/stream/route.ts`** – tar emot `?columns=id1,id2,id3&since=timestamp` (geo-filter-params som query-params)
```
GET /api/stream?columns=abc,def&regionCode=01&municipalityCode=0180
Endpoint:

Sätter headers: Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive
Registrerar en callback i eventQueue för varje kolumn
När items anländer: skickar data: {...}\n\n
Heartbeat var 30s: data: {"type":"heartbeat"}\n\n (håller anslutningen vid liv)
Vid disconnect (AbortSignal): avregistrerar callbacks

Konfiguration Cloud Run: Sätt --timeout=3600 (max 1h connections). Cloud Run stöder streaming natively.
Ny frontend-hook
lib/dashboard/hooks/useDashboardStream.ts ersätter useDashboardPolling.ts
typescriptconst source = new EventSource('/api/stream?columns=...')
source.onmessage = (event) => { /* uppdatera columnData */ }
source.onerror = () => { /* reconnect-logik med backoff */ }
```

- Returnerar samma interface som `useDashboardPolling` (`connectionStatus`, `stopAllPolling`) för att minimera ändringar i `MainDashboard`
- Hanterar reconnect automatiskt (EventSource gör det, men lägg till exponentiell backoff vid upprepade fel)
- Stänger ned stream när komponenten unmountas

### Behåll long-polling-endpoint
`app/api/columns/[id]/updates/route.ts` behålls tills vidare för bakåtkompatibilitet (kan användas av externa klienter som poller direkt).

### Verifiering
- Ny item postas via `/api/workflows` → syns i browser inom < 1 sekund
- TV-skärm (lång session): anslutning håller i > 1 timme med heartbeats
- Vid nätverksavbrott: reconnectar automatiskt utan manuell refresh
- Geo-filter fungerar: items filtreras korrekt i stream
- `connectionStatus` reflekterar korrekt state i UI
- Cloud Run request-timeout konfigurerad korrekt

---

## Fas 5 – GCP-infrastruktur (vid behov)
**Branch:** `infra/gcp-scaling`

### När detta behövs
Fas 1–4 ger ett system som håller för tusentals simultana användare. Fas 5 är aktuell om man ser DB-bottlenecks i Cloud SQL-metrics eller om cold starts på Cloud Run blir ett problem.

### Connection pooler
Cloud SQL Auth Proxy + PgBouncer i transaction mode. Eller: Cloud SQL flagga för inbyggd anslutningspoolning.
Öka pool-storleken i `lib/db-postgresql.ts` från 20 till 50–100 beroende på Cloud SQL-instansens storlek.

### GCP Memorystore (Redis)
Cacha dashboard-struktur och senaste 500 items per kolumn med TTL 60s. Minskar DB-reads drastiskt för populära dashboards. Relevanta platser:
- `app/api/dashboards/[slug]/route.ts` – cacha response
- `lib/event-queue.ts` – kan använda Redis Pub/Sub istället för in-memory för horisontell skalning av Cloud Run

### Horisontell skalning av SSE
In-memory event queue fungerar bara om alla requests landar på samma instans. Med flera Cloud Run-instanser: flytta `event-queue.ts` till Redis Pub/Sub. Publish vid ingestion → alla instanser prenumererar och kan svara på sina SSE-connections.

### Verifiering
- Load test: 1 000 simultana SSE-connections, ingestion av 10 items → alla klienter uppdateras
- DB-connections: max pool aldrig nådd under load test
- Cold start: Cloud Run minimum instances = 1 (eliminerar cold starts)

---

## Kritiska filer per fas

| Fas | Primära filer |
|-----|--------------|
| 1 | `lib/services/ingestion.ts`, `lib/db-postgresql.ts`, `package.json`, migration-fil |
| 2 | `components/MainDashboard.tsx`, nya filer i `components/column/` och `components/dashboard/`, `lib/dashboard/hooks/useColumnOperations.ts` |
| 3 | `lib/db-postgresql.ts` (appendColumnDataBatch, setColumnDataBatch, addNewsItems) |
| 4 | `app/api/stream/route.ts` (ny), `lib/event-queue.ts`, `lib/dashboard/hooks/useDashboardStream.ts` (ny), `components/MainDashboard.tsx` |
| 5 | `lib/db-postgresql.ts`, ny Redis-klient, `lib/event-queue.ts` |

## Ordning och beroenden
```
Fas 1 (städa) → Fas 2 (frontend) → Fas 3 (DB) → Fas 4 (SSE) → Fas 5 (infra)