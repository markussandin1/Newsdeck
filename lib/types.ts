export interface NewsItem {
  // Identifikation
  id: string;                    // Ursprungligt ID från källan (kan dupliceras)
  dbId: string;                  // Unikt UUID för denna databas-post
  workflowId: string;            // ID för workflow som skapat datan (kolumn-ID för bakåtkompatibilitet)
  flowId?: string;               // UUID från workflow-applikationen (nytt system)
  source: string;                // Källans namn (sos, polisen, smhi, tt, etc)
  timestamp: string;             // ISO 8601 format
  
  // Innehåll
  title: string;                 // Rubrik
  description?: string;          // Kort beskrivning
  
  // Prioritering
  newsValue: number;             // 5 = högst nyhetsvärde (tillåter 0 i nya flöden)
  category?: string;             // traffic, weather, crime, politics, economy, sports
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
  };
  
  // Metadata
  createdInDb?: string;         // ISO 8601 format - när posten skapades i databasen
  isNew?: boolean;              // Om meddelandet är nytt (visas i 30 sekunder)

  // Övrigt
  extra?: Record<string, any>;  // Källspecifika fält
  raw?: any;                    // Originaldata för debugging
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
  viewCount?: number;
  lastViewed?: string;
  isDefault?: boolean;          // Mark default dashboard (main-dashboard)
}

// Fake workflow data för POC
export interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  category: 'emergency' | 'police' | 'weather' | 'traffic' | 'news' | 'sports' | 'other';
}
