# Breaking News Dashboard POC

## Översikt
Bygg en minimalistisk proof-of-concept för ett breaking news dashboard-system. Systemet tar emot nyhetshändelser från AI-drivna agentiska workflows via API och visar dem i realtid på anpassningsbara dashboards.

## Kärnprinciper
- **Ingen mockad data** - all data kommer från riktiga källor via API eller manuell inmatning
- **Extremt enkelt** - inga användarkonton, alla dashboards är publika
- **Realtidsuppdateringar** - nya händelser visas direkt
- **Flexibelt** - dashboards kan filtrera på workflows, nyhetsvärde, geografi

## Dataformat (TypeScript)
```typescript
interface NewsItem {
  // Identifikation
  id: string;                    // Unikt ID för händelsen
  workflowId: string;            // ID för workflow som skapat datan
  source: string;                // Källans namn (sos, polisen, smhi, tt, etc)
  timestamp: string;             // ISO 8601 format
  
  // Innehåll
  title: string;                 // Rubrik
  description?: string;          // Kort beskrivning
  
  // Prioritering
  newsValue: 1 | 2 | 3 | 4 | 5; // 5 = högst nyhetsvärde
  category?: string;             // traffic, weather, crime, politics, economy, sports
  severity?: "critical" | "high" | "medium" | "low" | null;
  
  // Geografi
  location?: {
    municipality?: string;       // Kommun
    county?: string;            // Län
    name?: string;              // Platsnamn
    coordinates?: [number, number]; // [lat, lng]
  };
  
  // Övrigt
  extra?: Record<string, any>;  // Källspecifika fält
  raw?: any;                    // Originaldata för debugging
}

## Status: Slutfört

### ✅ Fas 1: Grundstruktur (KLAR)
**Datum:** 2025-09-11  
**Status:** Komplett och fungerande

**Implementerat:**
- ✅ Next.js 15 app med TypeScript och Tailwind CSS v3
- ✅ Komplett projektstruktur (/app, /components, /lib)
- ✅ TypeScript interfaces för NewsItem och Dashboard
- ✅ In-memory databas (lib/db.ts) för lagring
- ✅ API endpoint `/api/news-items` (POST & GET)
- ✅ Validering: obligatoriska fält, newsValue 1-5, timestamp-format
- ✅ Startsida `/` med dashboard-översikt
- ✅ Admin-sida `/admin` med exempeldata och feedback
- ✅ Responsiv design med Tailwind CSS

**Testresultat:**
- ✅ API fungerar: POST och GET endpoints validerade
- ✅ Admin-interface fungerar: kan mata in data och se feedback  
- ✅ Applikation körs på http://localhost:3000
- ✅ Alla sidor renderas korrekt

**Teknisk arkitektur:**
```
/app
  /page.tsx                 # ✅ Startsida med dashboard-lista
  /admin/page.tsx          # ✅ Admin-interface för datainmatning
  /api/news-items/route.ts # ✅ API endpoint
  /layout.tsx              # ✅ Grundlayout
  /globals.css             # ✅ Tailwind CSS
/lib
  /types.ts                # ✅ TypeScript interfaces
  /db.ts                   # ✅ In-memory databas
/components                # ✅ Redo för komponenter
```

---

### ✅ Fas 2: Dashboard-visning (KLAR)
**Datum:** 2025-09-11  
**Status:** Komplett och fungerande

**Implementerat:**
- ✅ NewsItem-komponent med visuell prioritering
- ✅ Dashboard-komponent med realtidsuppdateringar
- ✅ `/dashboard/[id]` route med dynamiska parametrar
- ✅ Dashboard API endpoints (GET, PUT) med filtrering
- ✅ Visual prioritering baserat på newsValue:
  - newsValue 5: röd ram + pulsering (kritiskt)
  - newsValue 4: orange ram (högt)
  - newsValue 3: gul ram (medium)
  - newsValue 1-2: grå ram (lågt)
- ✅ Responsiva grid-layouts (2, 3, 4 kolumner)
- ✅ Realtidsuppdateringar var 5:e sekund
- ✅ Filter-visning och dashboard-konfiguration
- ✅ Sticky header med dashboard-info och kontroller

**Testresultat:**
- ✅ Dashboard-visning fungerar: http://localhost:3000/dashboard/dashboard-1757625202432-kvjv6sqj9
- ✅ Visuell prioritering testad: Brand (newsValue 5) röd + pulsering, trafikolycka (newsValue 3) gul
- ✅ Filter fungerar: Bara nyheter med newsValue ≥ 2 visas
- ✅ API endpoints fungerar: GET och PUT för dashboards
- ✅ Responsiv design bekräftad i HTML-output

**Tekniska förbättringar:**
- ✅ Fixade Next.js 15 `params` async-problem
- ✅ Korrekt TypeScript-typer för alla komponenter
- ✅ Error handling och loading states
- ✅ SEO-vänliga metadata för dashboard-sidor

---

## Nästa steg: Fas 3

### 🔄 Fas 3: Skapa dashboards (NÄSTA)
Lägg till funktionalitet för att skapa och konfigurera dashboards.

**Ursprunglig specifikation:**

/ (Startsida)

Lista alla skapade dashboards i ett grid
Visa: namn, antal tittare (räknare), senast uppdaterad
"Skapa ny dashboard" knapp
Länk till /admin för datainmatning


/admin (Datainmatning)

Stort textarea för JSON-input
Validera NewsItem-format innan sparning
Visa success/error feedback
Lista de 10 senaste mottagna items


/api/news-items (API endpoint)

POST: Ta emot NewsItem eller array av NewsItems
Validera format
Spara i minnet initialt (databas kommer senare)
Returnera 200 OK eller 400 Bad Request med tydligt felmeddelande



Fas 2: Dashboard-visning
Implementera /dashboard/[id] som visar inkommande nyheter.
Features:

Layout: 2, 3 eller 4 kolumner (konfigurerbart)
Realtid: Nya items visas direkt överst (polling var 5:e sekund)
Visuell prioritering:

newsValue 5 = röd ram + pulsering
newsValue 4 = orange ram
newsValue 3 = gul ram
newsValue 1-2 = grå ram


Visa alla fält som finns i NewsItem
Responsiv: Fungerar på mobil, tablet, desktop, TV

Fas 3: Skapa dashboards
Lägg till funktionalitet för att skapa och konfigurera dashboards.
Dashboard-konfiguration:
typescriptinterface Dashboard {
  id: string;
  name: string;
  layout: "2-col" | "3-col" | "4-col";
  filters: {
    workflowIds?: string[];      // Visa bara dessa workflows
    minNewsValue?: number;        // Minimum nyhetsvärde
    municipalities?: string[];    // Bara dessa kommuner
    sources?: string[];          // Bara dessa källor
  };
  createdAt: string;
}
Skapa-flöde:

Klick på "Skapa ny dashboard"
Modal med formulär:

Namn (required)
Layout (dropdown)
Workflow-filter (multiselect från alla unika workflowIds i systemet)


Spara och redirect till nya dashboarden

Fas 4: Databas och persistens
Byt från in-memory till SQLite.
Databasschema:
sql-- Dashboards
CREATE TABLE dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  last_viewed DATETIME
);

-- Nyhetshändelser
CREATE TABLE news_items (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  source TEXT NOT NULL,
  news_value INTEGER NOT NULL,
  municipality TEXT,
  county TEXT,
  data JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index för snabb filtrering
CREATE INDEX idx_workflow ON news_items(workflow_id);
CREATE INDEX idx_newsvalue ON news_items(news_value);
CREATE INDEX idx_municipality ON news_items(municipality);
Fas 5: Förbättrad admin
Gör det enklare att testa med olika data.
Admin-features:

JSON-editor med syntax highlighting
Exempel-data knapp som visar korrekt format
Fil-uppladdning för bulk import
Test-generator - formulär för att skapa enskilda NewsItems
API-dokumentation med curl-exempel
Data-översikt - visa statistik och senaste händelser

Fas 6: Produktionsfeatures
Förbättringar för riktig användning.
Features att lägga till:

Auto-arkivering: Ta bort items äldre än 7 dagar
Export: Ladda ner data som JSON/CSV
Fullscreen-mode för TV-visning
Dark mode toggle
Sound alerts för newsValue 5
Sökfunktion på startsidan
Duplicera dashboard funktion
Basic API-key för säkerhet (miljövariabel)

Testdata för /admin
json{
  "items": [
    {
      "id": "sos-001",
      "workflowId": "workflow-emergency",
      "source": "sos",
      "timestamp": "2025-09-11T12:00:00Z",
      "title": "Brand i flerfamiljshus i Sundsvall",
      "description": "Räddningstjänst på plats med flera enheter",
      "newsValue": 4,
      "category": "emergency",
      "severity": "high",
      "location": {
        "municipality": "Sundsvall",
        "county": "Västernorrland",
        "name": "Storgatan 45"
      }
    },
    {
      "id": "police-002",
      "workflowId": "workflow-police",
      "source": "polisen",
      "timestamp": "2025-09-11T12:15:00Z",
      "title": "Trafikolycka E4 Rotebro",
      "description": "Två bilar inblandade, långa köer",
      "newsValue": 2,
      "category": "traffic",
      "location": {
        "municipality": "Sollentuna",
        "county": "Stockholm"
      }
    }
  ]
}
Teknisk implementation
Setup:
bashnpx create-next-app@latest dashboard-poc --typescript --tailwind --app
npm install sqlite3 sqlite
npm install date-fns
Mappstruktur:
/app
  /page.tsx                 # Startsida
  /admin/page.tsx          # Admin-interface
  /dashboard/[id]/page.tsx # Dashboard-visning
  /api
    /news-items/route.ts   # POST endpoint
    /dashboards/route.ts   # CRUD för dashboards
/components
  /NewsItem.tsx            # Komponent för att visa en nyhet
  /Dashboard.tsx           # Dashboard-layout
  /CreateDashboard.tsx     # Modal för att skapa dashboard
/lib
  /db.ts                   # Databasanslutning
  /types.ts                # TypeScript interfaces
Prioriteringsordning:

Få upp grundstruktur med API endpoint
Implementera admin för datainmatning
Skapa enkel dashboard som visar all data
Lägg till filtrering och konfiguration
Implementera databas
Polisha och lägg till extra features

Kom ihåg:

Ingen mockad data - vänta på riktig input via API/admin
Håll det enkelt - ingen autentisering, alla kan se allt
Fokus på visualisering - gör det tydligt vad som är viktigt (newsValue)
Realtid är viktigt - nya händelser ska synas direkt
Responsiv design - måste fungera på TV-skärmar och mobiler