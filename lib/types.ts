export interface NewsItem {
  // Identifikation
  id?: string;                   // Ursprungligt ID från källan (optional, kan dupliceras)
  dbId: string;                  // Unikt UUID för denna databas-post
  workflowId: string;            // ID för workflow som skapat datan (kolumn-ID för bakåtkompatibilitet)
  flowId?: string;               // UUID från workflow-applikationen (nytt system)
  source: string;                // Källans namn (sos, polisen, smhi, tt, etc)
  url?: string;                  // Länk till källa eller extern resurs
  timestamp: string;             // ISO 8601 format
  
  // Innehåll
  title: string;                 // Rubrik
  description?: string;          // Kort beskrivning
  
  // Prioritering
  newsValue: number;             // 5 = högst nyhetsvärde (tillåter 0 i nya flöden)
  category?: string;             // Standardiserade kategorier från lib/categories.ts (brand, trafikolycka, etc.)
  severity?: string | null;
  
  // Geografi
  location?: {
    country?: string;           // Land
    county?: string;            // Län
    municipality?: string;       // Kommun
    area?: string;              // Område
    street?: string;            // Gata/adress
    name?: string;              // Platsnamn (för bakåtkompatibilitet)
    coordinates?: number[];      // [lat, lng] eller annat format
    // Geographic codes from Workflows AI agent (new format)
    countryCode?: string;        // ISO 3166-1 alpha-2: 'SE' (provided by AI)
    regionCode?: string;         // SCB län code (2-digit): '01', '23', etc. (provided by AI)
    municipalityCode?: string;   // SCB kommun code (4-digit): '0180', etc. (provided by AI, nullable)
  };

  // Normaliserade geografiska koder (från reference tables)
  countryCode?: string;                  // ISO 3166-1 alpha-2: 'SE', 'NO', 'DK'
  regionCountryCode?: string;            // Land för län (samma som countryCode)
  regionCode?: string;                   // SCB länskod (2-digit): '01', '23', etc.
  municipalityCountryCode?: string;      // Land för kommun
  municipalityRegionCode?: string;       // Län för kommun (SCB 2-digit code)
  municipalityCode?: string;             // SCB kommunkod (4-digit): '0180', '1480', etc.

  // Metadata
  createdInDb?: string;         // ISO 8601 format - när posten skapades i databasen
  isNew?: boolean;              // Om meddelandet är nytt (yngre än 1 minut, visas med pulserande effekt i max 60 sekunder)

  // Övrigt
  extra?: Record<string, unknown>;  // Källspecifika fält
  raw?: unknown;                    // Originaldata för debugging
  trafficCamera?: {
    id: string;
    name: string;
    photoUrl: string;              // Trafikverket URL (fallback for backward compatibility)
    distance: number;              // km
    photoTime?: string;
    // New fields for GCS storage (added 2026-01-02)
    status?: 'pending' | 'ready' | 'failed';  // Upload status
    currentUrl?: string;           // GCS URL (persistent)
    currentTimestamp?: string;     // ISO timestamp of current image
    error?: string;                // Error message if status is 'failed'
    history?: Array<{              // Image history (max 10)
      url: string;
      timestamp: string;
    }>;
  };
}

export interface DashboardColumn {
  id: string;                  // UUID som används som endpoint för data
  title: string;               // Användardefinierad titel för kolumnen
  description?: string;        // Valfri beskrivning av vad kolumnen ska innehålla
  order: number;               // Sorteringsordning från vänster till höger
  createdAt: string;           // När kolumnen skapades
  isArchived?: boolean;        // Om kolumnen är arkiverad (dold men inte raderad)
  archivedAt?: string;         // När kolumnen arkiverades
  flowId?: string;             // UUID från workflow-applikationen att lyssna på
}

export interface Dashboard {
  id: string;
  name: string;
  slug: string;                 // URL-friendly name (auto-generated from name)
  description?: string;         // Optional description
  columns: DashboardColumn[];   // Array av kolumner istället för filters
  createdAt: string;
  createdBy: string;            // User ID of creator
  createdByName: string;        // Display name of creator
  viewCount?: number;
  lastViewed?: string;
  isDefault?: boolean;          // Mark default dashboard (main-dashboard)
  isFollowing?: boolean;        // Current user follows this dashboard (client-side only)
  followerCount?: number;       // Number of users following (client-side only)
}

export interface UserPreferences {
  userId: string;
  defaultDashboardId?: string;  // Hem-dashboard
  createdAt: string;
  updatedAt: string;
}

export interface DashboardFollow {
  userId: string;
  dashboardId: string;
  followedAt: string;
}

// Geographic metadata types (for filtering)
export interface Country {
  code: string;                // ISO 3166-1 alpha-2: 'SE', 'NO', 'DK'
  name: string;                // 'Sweden', 'Norway', 'Denmark'
  nameLocal?: string;          // 'Sverige', 'Norge', 'Danmark'
  createdAt: string;
}

export interface Region {
  countryCode: string;         // 'SE', 'NO', etc.
  code: string;                // SCB länskod: '01', '03', '12', etc.
  name: string;                // 'Stockholms län', 'Skåne län'
  nameShort?: string;          // 'Stockholm', 'Skåne'
  isActive: boolean;           // För soft deletes (länssammanslagningar)
  createdAt: string;
}

export interface Municipality {
  countryCode: string;
  regionCode: string;
  code: string;                // SCB kommunkod: '0180', '1480', etc.
  name: string;                // 'Stockholm', 'Göteborg', 'Malmö'
  isActive: boolean;           // För soft deletes (kommunsammanslagningar)
  mergedIntoCode?: string;     // Om kommunen slagits samman med annan
  createdAt: string;
}

export interface LocationNameMapping {
  id: number;
  variant: string;             // Normaliserad variant (lowercase, trimmed)
  countryCode?: string;
  regionCountryCode?: string;
  regionCode?: string;
  municipalityCountryCode?: string;
  municipalityRegionCode?: string;
  municipalityCode?: string;
  matchPriority: number;       // Lägre = högre prioritet (kommun > län > land)
  matchType: 'exact' | 'fuzzy';
  createdAt: string;
}

export interface GeoFilters {
  regionCodes: string[];                // Valda länskoder: ['01', '12', '25'] (SCB 2-digit codes)
  municipalityCodes: string[];          // Valda kommunkoder: ['0180', '1280', '2584'] (SCB 4-digit codes)
  showItemsWithoutLocation: boolean;    // Visa items utan geografisk data
}

// Fake workflow data för POC
export interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  category: 'emergency' | 'police' | 'weather' | 'traffic' | 'news' | 'sports' | 'other';
}
