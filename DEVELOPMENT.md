# NewsDeck - Local Development Guide

## Snabbstart

### 1. Installera Dependencies

```bash
npm install
```

### 2. Starta Lokal Database

Vi använder PostgreSQL i Docker för lokal utveckling:

```bash
./scripts/setup-local-db.sh
```

Detta script kommer att:
- Starta PostgreSQL i en Docker-container
- Skapa databasen `newsdeck_dev`
- Köra initiala migreringar
- Skapa en default "Main Dashboard" med en exempel-kolumn

### 3. Konfigurera Environment Variables

Scriptet skapar automatiskt `.env.local` från `.env.example`. Verifiera att följande finns i `.env.local`:

```env
DATABASE_URL=postgresql://newsdeck:newsdeck_local@localhost:5433/newsdeck_dev
```

### 4. Starta Development Server

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

---

## Database Management

### Ansluta till Databasen

```bash
# Via Docker
docker exec -it newsdeck-postgres psql -U newsdeck -d newsdeck_dev

# Via lokal psql (om installerat)
psql postgresql://newsdeck:newsdeck_local@localhost:5433/newsdeck_dev
```

### Användbara SQL-kommandon

```sql
-- Lista alla tabeller
\dt

-- Visa alla dashboards
SELECT * FROM dashboards;

-- Visa alla kolumner
SELECT * FROM columns;

-- Visa alla nyheter
SELECT * FROM news_items ORDER BY created_in_db DESC LIMIT 10;

-- Räkna antal nyheter per kolumn
SELECT
  c.title,
  COUNT(n.db_id) as news_count
FROM columns c
LEFT JOIN news_items n ON c.id = n.column_id
GROUP BY c.id, c.title;
```

### Docker Compose Kommandon

```bash
# Starta databasen
docker-compose up -d postgres

# Stoppa databasen
docker-compose down

# Stoppa och ta bort data (reset)
docker-compose down -v

# Visa logs
docker-compose logs -f postgres

# Starta om databasen
docker-compose restart postgres
```

---

## Testdata

### Skapa Testkolumn

```bash
curl -X POST http://localhost:3000/api/columns \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Column",
    "description": "En testkolumn för utveckling",
    "dashboardId": "main-dashboard"
  }'
```

### Lägg till Testnyheter

```bash
# Byt ut COLUMN_ID med ID från kolumnen ovan
curl -X POST http://localhost:3000/api/news-items \
  -H "Content-Type: application/json" \
  -d '{
    "columnId": "COLUMN_ID",
    "items": [
      {
        "id": "test-1",
        "workflowId": "test-workflow",
        "source": "test",
        "timestamp": "2025-01-15T10:00:00Z",
        "title": "Breaking: Test News Item",
        "description": "Detta är en testnyhetsartikel",
        "newsValue": 5,
        "category": "test"
      },
      {
        "id": "test-2",
        "workflowId": "test-workflow",
        "source": "test",
        "timestamp": "2025-01-15T10:05:00Z",
        "title": "Update: Another Test Item",
        "description": "Ännu en testnyhetsartikel",
        "newsValue": 3,
        "category": "test"
      }
    ]
  }'
```

---

## Mobilutveckling

### Testa Mobilvy

1. **Chrome DevTools (rekommenderat)**
   - Öppna DevTools (F12)
   - Klicka på "Toggle device toolbar" (Ctrl+Shift+M / Cmd+Shift+M)
   - Välj en mobilenhet eller "Responsive"

2. **Fysisk enhet**
   - Hitta din lokala IP: `ifconfig` (macOS/Linux) eller `ipconfig` (Windows)
   - Öppna `http://[DIN-IP]:3000` på din mobil
   - Exempel: `http://192.168.1.100:3000`

### Mobilfunktioner att Testa

- ✅ **Swipe-gester**: Svajpa höger/vänster mellan kolumner
- ✅ **Pull-to-refresh**: Dra ner från toppen för att uppdatera
- ✅ **Touch-feedback**: Tryck på knappar och se visuell feedback
- ✅ **Navigation**: Använd pilar och dot-indikator
- ✅ **iOS Safe Areas**: Testa på iPhone med notch/Dynamic Island

---

## Felsökning

### Port 5433 redan används

Om port 5433 redan används, ändra i `docker-compose.yml`:

```yaml
ports:
  - "5434:5432"  # Använd 5434 istället
```

Uppdatera sedan `DATABASE_URL` i `.env.local`:

```env
DATABASE_URL=postgresql://newsdeck:newsdeck_local@localhost:5434/newsdeck_dev
```

### Docker-container startar inte

```bash
# Kontrollera Docker status
docker ps -a

# Visa felmeddelanden
docker-compose logs postgres

# Rensa och starta om
docker-compose down -v
./scripts/setup-local-db.sh
```

### Databasen kopplar inte från Next.js

1. Kontrollera att `.env.local` existerar och har rätt `DATABASE_URL`
2. Starta om dev-servern: `npm run dev`
3. Kolla server-logs för felmeddelanden

### TypeScript-fel

```bash
# Bygg om types
npm run type-check

# Rensa Next.js cache
rm -rf .next
npm run dev
```

---

## Production vs Development

### Development (lokal)
- PostgreSQL i Docker på port 5433
- Hot reload aktiverat
- Detaljerade error messages
- Ingen autentisering krävs

### Production
- Cloud SQL / Supabase / managed PostgreSQL
- Optimerad build
- Error tracking (Sentry, etc.)
- API key-baserad autentisering (valfritt)

---

## Nästa Steg

- Läs [README.md](./README.md) för övergripande projektinfo
- Se [CLAUDE.md](./CLAUDE.md) för arkitektur och design decisions
- Kolla [package.json](./package.json) för alla tillgängliga scripts

---

## Behöver Hjälp?

- Öppna en issue på GitHub
- Kontakta utvecklingsteamet
- Se troubleshooting-sektionen ovan
