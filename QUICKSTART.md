# NewsDeck - Snabbstart för Lokal Utveckling

## Problem & Lösning

Den lokala databasen saknar vissa produktionsfunktioner (auth-tabeller etc). Här är den **enklaste** vägen till en fungerande lokal miljö:

## Alternativ 1: Kör utan databas (Enklast)

Newsdeck har redan in-memory fallback! Du behöver inte en databas för att utveckla.

```bash
# Ta bort DATABASE_URL helt från .env.local
echo "NODE_ENV=development" > .env.local

# Starta dev-servern
npm run dev

# Öppna http://localhost:3000
```

**Fördelar:**
- Inga Docker-dependencies
- Snabbare setup
- Data går inte förlorad mellan restarter (i minnet under sessionen)

**Nackdelar:**
- Data försvinner när servern startas om
- Kan inte testa databas-specifik funktionalitet

## Alternativ 2: Använd produktionsdatabasen via Cloud SQL Proxy (Rekommenderat för test)

För att testa med riktig data:

```bash
# 1. Starta Cloud SQL Proxy (i separat terminal)
gcloud sql connect newsdeck-db --database=newsdeck --project=newsdeck-473620 --port=5432

# 2. Uppdatera .env.local
echo "DATABASE_URL=postgresql://newsdeck-user:bt7M1kQvgxokVayDWheKIAs4ZDZnrNefz9+Ond7jAzY=@localhost:5432/newsdeck" > .env.local
echo "NODE_ENV=development" >> .env.local

# 3. Starta dev-servern
npm run dev
```

**Fördelar:**
- Riktig data och alla funktioner
- Testar mot faktisk produktionsdatabas
- Inga schema-problem

**Nackdelar:**
- Kräver gcloud CLI
- Måste komma ihåg att starta proxy
- Risk att påverka production-data (var försiktig!)

## Alternativ 3: Lokal Docker PostgreSQL (För avancerad utveckling)

Om du vill ha en helt isolerad lokal databas:

```bash
# 1. Starta databasen
npm run db:setup

# 2. Uppdatera .env.local
echo "DATABASE_URL=postgresql://newsdeck:newsdeck_local@localhost:5433/newsdeck_dev" > .env.local
echo "NODE_ENV=development" >> .env.local

# 3. Starta dev-servern
npm run dev
```

**OBS:** Det lokala schemat matchar inte production 100%, så vissa funktioner (som auth, dashboard-follows) kanske inte fungerar.

## Rekommendation

För daglig utveckling: **Alternativ 1** (In-memory)
För att testa med riktig data: **Alternativ 2** (Cloud SQL Proxy)
För avancerad databas-utveckling: **Alternativ 3** (Docker)

## Felsökning

### "Internal server error" från API

```bash
# Kolla server logs
# Troligen saknas databas-anslutning eller tabeller

# Lösning: Använd in-memory mode
rm .env.local  # eller ta bort DATABASE_URL
npm run dev
```

### "Port 3000 is in use"

Servern väljer automatiskt en annan port (3001, 3002, etc). Kolla terminal-output för rätt port.

### Docker-databasen startar inte

```bash
# Kolla status
docker ps -a

# Visa logs
npm run db:logs

# Reset helt
npm run db:reset
```

## Mobiltestning

```bash
# 1. Hitta din lokala IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# 2. Öppna http://[DIN-IP]:3000 på din mobil
# Exempel: http://192.168.1.100:3000
```

## Nästa steg

Se [DEVELOPMENT.md](./DEVELOPMENT.md) för mer detaljerad info om:
- Testdata
- Mobilutveckling
- Felsökning
- API-dokumentation
