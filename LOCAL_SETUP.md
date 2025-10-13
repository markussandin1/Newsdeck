# Lokal Utveckling - Enkel Guide

## Snabbstart (2 steg)

```bash
# 1. Starta lokal databas med testdata
npm run db:setup

# 2. Starta utvecklingsservern
npm run dev
```

Klart! Öppna http://localhost:3000 (eller porten som visas)

## Vad får du?

- ✅ Lokal PostgreSQL i Docker (port 5433)
- ✅ 1 dashboard: "Huvuddashboard"
- ✅ 3 kolumner: Breaking News, Väder & SMHI, Trafik & Olyckor
- ✅ 8 testnyheter fördelade över kolumnerna
- ✅ Ingen autentisering (skippad i development mode)

## Testdata

**Breaking News:**
- Brand i flerfamiljshus i Stockholm (newsValue: 5, kritisk)
- Polispådrag efter rån i Göteborg (newsValue: 4, hög)
- Regeringen presenterar klimatpaket (newsValue: 3, medium)

**Väder & SMHI:**
- Klass 2-varning snö i Norrbotten (newsValue: 4, hög)
- Sol och värme i Skåne (newsValue: 2, låg)

**Trafik & Olyckor:**
- Trafikolycka E4 Rotebro (newsValue: 3, medium)
- Stillastående trafik E6 Göteborg (newsValue: 2, medium)

## Databas-kommandon

```bash
npm run db:start   # Starta databasen
npm run db:stop    # Stoppa databasen
npm run db:reset   # Återställ (radera all data och börja om)
npm run db:logs    # Visa databas-logs
npm run db:connect # Anslut till databas CLI
```

## Lägg till mer testdata

Via admin-gränssnittet (http://localhost:3000/admin):

```json
{
  "columnId": "COL_ID_FRÅN_DASHBOARD",
  "items": [{
    "id": "test-news-1",
    "workflowId": "workflow-test",
    "source": "manual",
    "timestamp": "2025-01-15T12:00:00Z",
    "title": "Din testnyhetsrubrik här",
    "description": "Beskrivning av nyheten",
    "newsValue": 5,
    "category": "test"
  }]
}
```

## Mobiltest

```bash
# Hitta din lokala IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Öppna på mobil:
http://[DIN-IP]:3000
# T.ex: http://192.168.1.99:3000
```

## Felsökning

**"Port 3000 is in use"**
- Servern väljer automatiskt nästa lediga port (3001, 3002, etc)
- Kolla terminal-output för rätt port

**Docker startar inte**
```bash
docker ps -a                # Kolla status
npm run db:logs             # Visa felmeddelanden
npm run db:reset            # Reset och försök igen
```

**Ingen data visas**
```bash
# Verifiera att data finns
docker exec newsdeck-postgres psql -U newsdeck -d newsdeck_dev -c "SELECT COUNT(*) FROM news_items;"

# Om 0 rows: återskapa databasen
npm run db:reset
```

## Vad är annorlunda mot production?

- ✅ Ingen autentisering (middleware skippar auth i development)
- ✅ Inga "followers" (API skippar följare-funktioner i development)
- ✅ Lokal databas (inte Cloud SQL)
- ✅ Testdata istället för riktig data

Allt för att du ska kunna testa GUI:t snabbt och enkelt!
