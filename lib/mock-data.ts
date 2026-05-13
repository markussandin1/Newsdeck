/**
 * Mock data for local development without a database.
 * Used when DATABASE_URL is not set.
 */

import { Dashboard, NewsItem, DashboardColumn } from './types'

// Generate unique IDs
const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Mock columns
const mockColumns: DashboardColumn[] = [
  {
    id: 'col-sos-alarm',
    title: 'SOS Alarm',
    description: 'Händelser från SOS Alarm',
    order: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'col-polisen',
    title: 'Polisen',
    description: 'Polishändelser',
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'col-trafikverket',
    title: 'Trafikverket',
    description: 'Trafikstörningar',
    order: 2,
    createdAt: new Date().toISOString(),
  },
]

// Mock dashboard
export const mockDashboard: Dashboard = {
  id: 'main-dashboard',
  name: 'Huvuddashboard (Lokal)',
  slug: 'main',
  description: 'Lokalt testläge utan databas',
  columns: mockColumns,
  createdAt: new Date().toISOString(),
  createdBy: 'local-dev',
  createdByName: 'Lokal utvecklare',
  isDefault: true,
}

// Helper to create a news item
function createMockNewsItem(
  title: string,
  source: string,
  category: string,
  newsValue: 1 | 2 | 3 | 4 | 5,
  location?: { municipality?: string; county?: string },
  minutesAgo: number = 0
): NewsItem {
  const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000)
  return {
    id: generateId(),
    dbId: generateId(),
    workflowId: 'mock-workflow',
    source,
    timestamp: timestamp.toISOString(),
    createdInDb: timestamp.toISOString(),
    title,
    description: `Automatiskt genererad händelse för testning av ${source}.`,
    newsValue,
    category,
    severity: newsValue >= 4 ? 'high' : newsValue >= 3 ? 'medium' : 'low',
    location: location ? { ...location, name: location.municipality } : undefined,
    isNew: minutesAgo < 1,
  }
}

// Mock news items per column
export const mockColumnData: Record<string, NewsItem[]> = {
  'col-sos-alarm': [
    createMockNewsItem(
      'Brand i flerfamiljshus',
      'SOS Alarm',
      'brand',
      5,
      { municipality: 'Stockholm', county: 'Stockholms län' },
      0
    ),
    createMockNewsItem(
      'Trafikolycka på E4',
      'SOS Alarm',
      'trafikolycka',
      4,
      { municipality: 'Sollentuna', county: 'Stockholms län' },
      5
    ),
    createMockNewsItem(
      'Sjukvårdslarm - Centralen',
      'SOS Alarm',
      'sjukvard',
      3,
      { municipality: 'Stockholm', county: 'Stockholms län' },
      12
    ),
    createMockNewsItem(
      'Automatlarm industri',
      'SOS Alarm',
      'automatlarm',
      2,
      { municipality: 'Huddinge', county: 'Stockholms län' },
      25
    ),
    createMockNewsItem(
      'Trafikstörning Södermalm',
      'SOS Alarm',
      'trafik',
      2,
      { municipality: 'Stockholm', county: 'Stockholms län' },
      45
    ),
  ],
  'col-polisen': [
    createMockNewsItem(
      'Misstänkt stöld i butik',
      'Polisen',
      'stold',
      3,
      { municipality: 'Malmö', county: 'Skåne län' },
      3
    ),
    createMockNewsItem(
      'Rattfylleri - förare stoppad',
      'Polisen',
      'rattfylleri',
      3,
      { municipality: 'Göteborg', county: 'Västra Götalands län' },
      18
    ),
    createMockNewsItem(
      'Ordningsstörning på torg',
      'Polisen',
      'ordning',
      2,
      { municipality: 'Uppsala', county: 'Uppsala län' },
      30
    ),
    createMockNewsItem(
      'Skadegörelse på skola',
      'Polisen',
      'skadegorelse',
      2,
      { municipality: 'Västerås', county: 'Västmanlands län' },
      55
    ),
  ],
  'col-trafikverket': [
    createMockNewsItem(
      'Olycka E6 norrgående - 1 fil avstängd',
      'Trafikverket',
      'trafikolycka',
      4,
      { municipality: 'Helsingborg', county: 'Skåne län' },
      2
    ),
    createMockNewsItem(
      'Vägarbete Rv 40 - Begränsad framkomlighet',
      'Trafikverket',
      'vagarbete',
      2,
      { municipality: 'Borås', county: 'Västra Götalands län' },
      60
    ),
    createMockNewsItem(
      'Hinder på väg - E18',
      'Trafikverket',
      'hinder',
      3,
      { municipality: 'Enköping', county: 'Uppsala län' },
      90
    ),
  ],
}

// In-memory state for mock database
let currentDashboard = { ...mockDashboard }
const currentColumnData: Record<string, NewsItem[]> = JSON.parse(JSON.stringify(mockColumnData))

/**
 * Mock database implementation for local development
 */
export const mockDb = {
  // Dashboard operations
  getMainDashboard: async (): Promise<Dashboard> => {
    console.log('📦 [MOCK DB] getMainDashboard')
    return currentDashboard
  },

  getDashboard: async (id: string): Promise<Dashboard | null> => {
    console.log(`📦 [MOCK DB] getDashboard: ${id}`)
    if (id === 'main-dashboard' || id === 'main') {
      return currentDashboard
    }
    return null
  },

  getDashboardBySlug: async (slug: string): Promise<Dashboard | null> => {
    console.log(`📦 [MOCK DB] getDashboardBySlug: ${slug}`)
    if (slug === 'main' || slug === 'main-dashboard') {
      return currentDashboard
    }
    return null
  },

  getAllDashboards: async (): Promise<Dashboard[]> => {
    console.log('📦 [MOCK DB] getAllDashboards')
    return [currentDashboard]
  },

  updateDashboard: async (id: string, updates: Partial<Dashboard>): Promise<Dashboard | null> => {
    console.log(`📦 [MOCK DB] updateDashboard: ${id}`, updates)
    if (id === 'main-dashboard' || id === 'main') {
      currentDashboard = { ...currentDashboard, ...updates }
      return currentDashboard
    }
    return null
  },

  deleteDashboard: async (id: string): Promise<boolean> => {
    console.log(`📦 [MOCK DB] deleteDashboard: ${id}`)
    if (id === 'main-dashboard' || id === 'main') {
      throw new Error('Main dashboard cannot be deleted')
    }
    // Mock has only one dashboard so nothing to delete
    return false
  },

  createDashboard: async (dashboard: Partial<Dashboard>): Promise<Dashboard> => {
    console.log('📦 [MOCK DB] createDashboard', dashboard)
    const newDashboard: Dashboard = {
      id: generateId(),
      name: dashboard.name || 'Ny Dashboard',
      slug: dashboard.slug || 'new-dashboard',
      description: dashboard.description,
      columns: [],
      createdAt: new Date().toISOString(),
      createdBy: 'local-dev',
      createdByName: 'Lokal utvecklare',
    }
    return newDashboard
  },

  // Column operations
  getColumn: async (id: string): Promise<DashboardColumn | null> => {
    console.log(`📦 [MOCK DB] getColumn: ${id}`)
    return currentDashboard.columns.find(c => c.id === id) || null
  },

  createColumn: async (column: Partial<DashboardColumn>): Promise<DashboardColumn> => {
    console.log('📦 [MOCK DB] createColumn', column)
    const newColumn: DashboardColumn = {
      id: generateId(),
      title: column.title || 'Ny kolumn',
      description: column.description,
      order: currentDashboard.columns.length,
      createdAt: new Date().toISOString(),
    }
    currentDashboard.columns.push(newColumn)
    currentColumnData[newColumn.id] = []
    return newColumn
  },

  updateColumn: async (id: string, updates: Partial<DashboardColumn>): Promise<DashboardColumn | null> => {
    console.log(`📦 [MOCK DB] updateColumn: ${id}`, updates)
    const index = currentDashboard.columns.findIndex(c => c.id === id)
    if (index !== -1) {
      currentDashboard.columns[index] = { ...currentDashboard.columns[index], ...updates }
      return currentDashboard.columns[index]
    }
    return null
  },

  archiveColumn: async (id: string): Promise<boolean> => {
    console.log(`📦 [MOCK DB] archiveColumn: ${id}`)
    const column = currentDashboard.columns.find(c => c.id === id)
    if (column) {
      column.isArchived = true
      column.archivedAt = new Date().toISOString()
      return true
    }
    return false
  },

  restoreColumn: async (id: string): Promise<boolean> => {
    console.log(`📦 [MOCK DB] restoreColumn: ${id}`)
    const column = currentDashboard.columns.find(c => c.id === id)
    if (column) {
      column.isArchived = false
      column.archivedAt = undefined
      return true
    }
    return false
  },

  // Column data operations
  getColumnData: async (columnId: string, limit?: number): Promise<NewsItem[]> => {
    console.log(`📦 [MOCK DB] getColumnData: ${columnId}, limit: ${limit}`)
    const items = currentColumnData[columnId] || []
    return limit ? items.slice(0, limit) : items
  },

  getColumnDataBatch: async (columnIds: string[], limit?: number): Promise<Record<string, NewsItem[]>> => {
    console.log(`📦 [MOCK DB] getColumnDataBatch: ${columnIds.join(', ')}`)
    const result: Record<string, NewsItem[]> = {}
    for (const id of columnIds) {
      const items = currentColumnData[id] || []
      result[id] = limit ? items.slice(0, limit) : items
    }
    return result
  },

  // addNewsItems supports both signatures:
  // - (items: NewsItem[]) for IngestionDb interface
  // - (columnIds: string[], items: NewsItem[]) for extended functionality
  addNewsItems: async (itemsOrColumnIds: NewsItem[] | string[], itemsOrUndefined?: NewsItem[]): Promise<NewsItem[]> => {
    let columnIds: string[]
    let items: NewsItem[]

    // Determine which signature was used
    if (itemsOrUndefined !== undefined) {
      // Called with (columnIds, items)
      columnIds = itemsOrColumnIds as string[]
      items = itemsOrUndefined
    } else {
      // Called with (items) - add to all columns
      items = itemsOrColumnIds as NewsItem[]
      columnIds = Object.keys(currentColumnData)
    }

    console.log(`📦 [MOCK DB] addNewsItems to ${columnIds.join(', ')}:`, items.length, 'items')
    const itemsWithIds = items.map(item => ({
      ...item,
      dbId: item.dbId || generateId(),
      createdInDb: item.createdInDb || new Date().toISOString(),
    }))

    for (const columnId of columnIds) {
      if (!currentColumnData[columnId]) {
        currentColumnData[columnId] = []
      }
      currentColumnData[columnId] = [...itemsWithIds, ...currentColumnData[columnId]]
    }

    return itemsWithIds
  },

  clearColumnData: async (columnId: string): Promise<boolean> => {
    console.log(`📦 [MOCK DB] clearColumnData: ${columnId}`)
    currentColumnData[columnId] = []
    return true
  },

  // User preferences (stub)
  getUserPreferences: async (): Promise<null> => null,
  setUserPreferences: async (): Promise<void> => {},

  // Stats
  getStats: async () => ({
    dashboardCount: 1,
    columnCount: currentDashboard.columns.length,
    newsItemCount: Object.values(currentColumnData).reduce<number>((sum, items) => sum + items.length, 0),
  }),

  // Additional methods required by API routes (stubs for local dev)
  getDashboards: async (): Promise<Dashboard[]> => {
    console.log('📦 [MOCK DB] getDashboards')
    return [currentDashboard]
  },

  getArchivedColumns: async (dashboardId: string): Promise<DashboardColumn[]> => {
    console.log(`📦 [MOCK DB] getArchivedColumns: ${dashboardId}`)
    return currentDashboard.columns.filter(c => c.isArchived)
  },

  addColumnToDashboard: async (dashboardId: string, column: DashboardColumn): Promise<DashboardColumn> => {
    console.log(`📦 [MOCK DB] addColumnToDashboard: ${dashboardId}`, column)
    currentDashboard.columns.push(column)
    currentColumnData[column.id] = []
    return column
  },

  removeColumnFromDashboard: async (dashboardId: string, columnId: string): Promise<boolean> => {
    console.log(`📦 [MOCK DB] removeColumnFromDashboard: ${dashboardId}, ${columnId}`)
    const column = currentDashboard.columns.find(c => c.id === columnId)
    if (column) {
      column.isArchived = true
      column.archivedAt = new Date().toISOString()
      return true
    }
    return false
  },

  restoreColumnInDashboard: async (dashboardId: string, columnId: string): Promise<boolean> => {
    console.log(`📦 [MOCK DB] restoreColumnInDashboard: ${dashboardId}, ${columnId}`)
    const column = currentDashboard.columns.find(c => c.id === columnId)
    if (column) {
      column.isArchived = false
      column.archivedAt = undefined
      return true
    }
    return false
  },

  setColumnData: async (columnId: string, items: NewsItem[]): Promise<void> => {
    console.log(`📦 [MOCK DB] setColumnData: ${columnId}`, items.length, 'items')
    currentColumnData[columnId] = items
  },

  setColumnDataBatch: async (data: Record<string, NewsItem[]>): Promise<void> => {
    console.log('📦 [MOCK DB] setColumnDataBatch')
    Object.entries(data).forEach(([columnId, items]) => {
      currentColumnData[columnId] = items
    })
  },

  appendColumnDataBatch: async (data: Record<string, NewsItem[]>): Promise<void> => {
    console.log('📦 [MOCK DB] appendColumnDataBatch')
    Object.entries(data).forEach(([columnId, items]) => {
      if (!currentColumnData[columnId]) {
        currentColumnData[columnId] = []
      }
      currentColumnData[columnId] = [...items, ...currentColumnData[columnId]]
    })
  },

  // Follow/unfollow (stubs)
  followDashboard: async (): Promise<void> => {
    console.log('📦 [MOCK DB] followDashboard (stub)')
  },

  unfollowDashboard: async (): Promise<void> => {
    console.log('📦 [MOCK DB] unfollowDashboard (stub)')
  },

  isFollowingDashboard: async (): Promise<boolean> => {
    console.log('📦 [MOCK DB] isFollowingDashboard (stub)')
    return false
  },

  getFollowedDashboards: async (): Promise<Dashboard[]> => {
    console.log('📦 [MOCK DB] getFollowedDashboards (stub)')
    return []
  },

  // Admin/logging stubs
  logApiRequest: async (): Promise<void> => {
    // Silent stub for logging
  },

  getApiRequestLogs: async (): Promise<unknown[]> => {
    console.log('📦 [MOCK DB] getApiRequestLogs (stub)')
    return []
  },

  cleanupOldItems: async (): Promise<{ success: boolean; removedCount: number; cutoffDate: string }> => {
    console.log('📦 [MOCK DB] cleanupOldItems (stub)')
    return { success: true, removedCount: 0, cutoffDate: new Date().toISOString() }
  },

  reorderColumns: async (dashboardId: string, columnIds: string[]): Promise<boolean> => {
    console.log(`📦 [MOCK DB] reorderColumns: ${dashboardId}`, columnIds)
    columnIds.forEach((id, index) => {
      const column = currentDashboard.columns.find(c => c.id === id)
      if (column) {
        column.order = index
      }
    })
    currentDashboard.columns.sort((a, b) => a.order - b.order)
    return true
  },

  syncAllColumnsDataFromGeneral: async (): Promise<void> => {
    console.log('📦 [MOCK DB] syncAllColumnsDataFromGeneral (stub)')
  },

  syncColumnDataFromGeneral: async (): Promise<void> => {
    console.log('📦 [MOCK DB] syncColumnDataFromGeneral (stub)')
  },

  getUserDashboardFollows: async (): Promise<string[]> => {
    console.log('📦 [MOCK DB] getUserDashboardFollows (stub)')
    return []
  },

  getDashboardFollowers: async (): Promise<string[]> => {
    console.log('📦 [MOCK DB] getDashboardFollowers (stub)')
    return []
  },

  getNewsItems: async (): Promise<NewsItem[]> => {
    console.log('📦 [MOCK DB] getNewsItems')
    const allItems: NewsItem[] = []
    Object.values(currentColumnData).forEach(items => {
      allItems.push(...items)
    })
    return allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  deleteNewsItem: async (dbId: string): Promise<boolean> => {
    console.log(`📦 [MOCK DB] deleteNewsItem: ${dbId}`)
    for (const columnId of Object.keys(currentColumnData)) {
      const index = currentColumnData[columnId].findIndex(item => item.dbId === dbId)
      if (index !== -1) {
        currentColumnData[columnId].splice(index, 1)
        return true
      }
    }
    return false
  },

}

/**
 * Add a simulated new event (for testing notifications)
 */
export function simulateNewEvent(columnId: string): NewsItem {
  const sources = ['SOS Alarm', 'Polisen', 'Trafikverket']
  const categories = ['brand', 'trafikolycka', 'stold', 'ordning', 'vagarbete']
  const titles = [
    'Trafikolycka med personskador',
    'Brand i byggnad',
    'Misstänkt inbrott',
    'Ordningsstörning centrum',
    'Vägarbete med stopp',
    'Ambulansutryckning',
    'Räddningsinsats pågår',
  ]
  const municipalities = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Linköping']

  const item = createMockNewsItem(
    titles[Math.floor(Math.random() * titles.length)],
    sources[Math.floor(Math.random() * sources.length)],
    categories[Math.floor(Math.random() * categories.length)],
    (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
    { municipality: municipalities[Math.floor(Math.random() * municipalities.length)], county: 'Testlän' },
    0
  )

  if (!currentColumnData[columnId]) {
    currentColumnData[columnId] = []
  }
  currentColumnData[columnId] = [item, ...currentColumnData[columnId]]

  console.log(`🆕 [MOCK] Simulated new event in ${columnId}:`, item.title)
  return item
}
