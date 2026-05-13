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
  
  // Geografi (fri form – sparas i raw JSONB, ingen validering i Newsdeck)
  location?: {
    country?: string;
    county?: string;
    municipality?: string;
    area?: string;
    street?: string;
    name?: string;
    coordinates?: number[];
    // Frivilliga geo-koder från Workflows. Sparas i JSONB om de skickas,
    // men används inte för filtrering eller validering i Newsdeck.
    countryCode?: string;
    regionCode?: string;
    municipalityCode?: string;
    regionGeoId?: string;
    regionName?: string;
    municipalityGeoId?: string;
    municipalityName?: string;
  };

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

// Fake workflow data för POC
export interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  category: 'emergency' | 'police' | 'weather' | 'traffic' | 'news' | 'sports' | 'other';
}
