export interface NewsItem {
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

export interface DashboardColumn {
  id: string;                  // UUID som används som endpoint för data
  title: string;               // Användardefinierad titel för kolumnen  
  description?: string;        // Valfri beskrivning av vad kolumnen ska innehålla
  order: number;               // Sorteringsordning från vänster till höger
  createdAt: string;           // När kolumnen skapades
  isArchived?: boolean;        // Om kolumnen är arkiverad (dold men inte raderad)
  archivedAt?: string;         // När kolumnen arkiverades
}

export interface Dashboard {
  id: string;
  name: string;
  columns: DashboardColumn[];   // Array av kolumner istället för filters
  createdAt: string;
  viewCount?: number;
  lastViewed?: string;
}

// Fake workflow data för POC
export interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  category: 'emergency' | 'police' | 'weather' | 'traffic' | 'news' | 'sports' | 'other';
}