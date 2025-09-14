import { kv } from '@vercel/kv'
import { NewsItem, Dashboard, DashboardColumn } from './types'

// Keys for Redis storage
const KEYS = {
  DASHBOARDS: 'dashboards',
  DASHBOARD: (id: string) => `dashboard:${id}`,
  COLUMN_DATA: (columnId: string) => `column_data:${columnId}`,
  NEWS_ITEMS: 'news_items'
}

// Default dashboard that always exists
const DEFAULT_DASHBOARD: Dashboard = {
  id: 'main-dashboard',
  name: 'Huvuddashboard',
  slug: 'main',
  description: 'Din huvuddashboard för nyhetsövervakning',
  columns: [],
  createdAt: new Date().toISOString(),
  viewCount: 0,
  isDefault: true
}

// Fallback to in-memory storage if KV is not available (for local development)
let fallbackNewsItems: NewsItem[] = []
let fallbackDashboards: Dashboard[] = []
let fallbackColumnData = new Map<string, NewsItem[]>()

const isKVAvailable = () => {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

export const persistentDb = {
  // News items
  addNewsItem: async (item: NewsItem) => {
    if (isKVAvailable()) {
      const existing = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
      const updated = [...existing, item]
      await kv.set(KEYS.NEWS_ITEMS, updated)
      return item
    } else {
      // Fallback to in-memory
      fallbackNewsItems.push(item)
      return item
    }
  },

  addNewsItems: async (items: NewsItem[]) => {
    if (isKVAvailable()) {
      const existing = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
      const updated = [...existing, ...items]
      await kv.set(KEYS.NEWS_ITEMS, updated)
      return items
    } else {
      // Fallback to in-memory
      fallbackNewsItems.push(...items)
      return items
    }
  },

  getNewsItems: async () => {
    if (isKVAvailable()) {
      const items = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
      return items.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    } else {
      return [...fallbackNewsItems].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    }
  },

  getRecentNewsItems: async (limit = 10) => {
    const items = await persistentDb.getNewsItems()
    return items.slice(0, limit)
  },

  // Dashboards
  addDashboard: async (dashboard: Dashboard) => {
    if (isKVAvailable()) {
      const existing = await kv.get<Dashboard[]>(KEYS.DASHBOARDS) || []
      const updated = [...existing, dashboard]
      await kv.set(KEYS.DASHBOARDS, updated)
      await kv.set(KEYS.DASHBOARD(dashboard.id), dashboard)
      return dashboard
    } else {
      // Fallback to in-memory
      fallbackDashboards.push(dashboard)
      return dashboard
    }
  },

  getDashboards: async () => {
    if (isKVAvailable()) {
      const dashboards = await kv.get<Dashboard[]>(KEYS.DASHBOARDS) || []
      return dashboards.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } else {
      return [...fallbackDashboards].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
  },

  getDashboard: async (id: string) => {
    if (id === 'main-dashboard') {
      // Always return the main dashboard, merge with any stored version
      const stored = isKVAvailable() 
        ? await kv.get<Dashboard>(KEYS.DASHBOARD('main-dashboard'))
        : fallbackDashboards.find(d => d.id === 'main-dashboard')
      const result = stored || DEFAULT_DASHBOARD
      // Ensure columns array exists
      if (!result.columns) {
        result.columns = []
      }
      return result
    }

    if (isKVAvailable()) {
      const result = await kv.get<Dashboard>(KEYS.DASHBOARD(id))
      if (result && !result.columns) {
        result.columns = []
      }
      return result
    } else {
      const result = fallbackDashboards.find(d => d.id === id)
      if (result && !result.columns) {
        result.columns = []
      }
      return result
    }
  },

  // Get or create the main dashboard
  getMainDashboard: async () => {
    let main = await persistentDb.getDashboard('main-dashboard')
    if (!main) {
      main = { ...DEFAULT_DASHBOARD }
      await persistentDb.addDashboard(main)
    }
    return main
  },

  // Get dashboard by slug
  getDashboardBySlug: async (slug: string) => {
    if (isKVAvailable()) {
      const dashboards = await kv.get<Dashboard[]>(KEYS.DASHBOARDS) || []
      const dashboard = dashboards.find(d => d.slug === slug)
      if (dashboard && !dashboard.columns) {
        dashboard.columns = []
      }
      return dashboard || null
    } else {
      const dashboard = fallbackDashboards.find(d => d.slug === slug)
      if (dashboard && !dashboard.columns) {
        dashboard.columns = []
      }
      return dashboard || null
    }
  },

  // Create new dashboard
  createDashboard: async (name: string, description?: string) => {
    const { generateSlug, ensureUniqueSlug } = await import('./utils')
    
    // Get existing slugs to ensure uniqueness
    const existingDashboards = await persistentDb.getDashboards()
    const existingSlugs = existingDashboards.map(d => d.slug)
    
    // Generate unique slug
    const baseSlug = generateSlug(name)
    const uniqueSlug = ensureUniqueSlug(baseSlug, existingSlugs)
    
    const newDashboard: Dashboard = {
      id: `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      slug: uniqueSlug,
      description,
      columns: [],
      createdAt: new Date().toISOString(),
      viewCount: 0
    }
    
    await persistentDb.addDashboard(newDashboard)
    return newDashboard
  },

  updateDashboard: async (id: string, updates: Partial<Dashboard>) => {
    if (isKVAvailable()) {
      const existing = await kv.get<Dashboard>(KEYS.DASHBOARD(id))
      if (existing) {
        const updated = { ...existing, ...updates }
        await kv.set(KEYS.DASHBOARD(id), updated)
        
        // Update in dashboards list
        const allDashboards = await kv.get<Dashboard[]>(KEYS.DASHBOARDS) || []
        const index = allDashboards.findIndex(d => d.id === id)
        if (index !== -1) {
          allDashboards[index] = updated
          await kv.set(KEYS.DASHBOARDS, allDashboards)
        }
        return updated
      } else if (id === 'main-dashboard') {
        // Create main dashboard if it doesn't exist
        const newDashboard = { ...DEFAULT_DASHBOARD, ...updates }
        await persistentDb.addDashboard(newDashboard)
        return newDashboard
      }
      return null
    } else {
      // Fallback to in-memory
      const index = fallbackDashboards.findIndex(d => d.id === id)
      if (index !== -1) {
        fallbackDashboards[index] = { ...fallbackDashboards[index], ...updates }
        return fallbackDashboards[index]
      } else if (id === 'main-dashboard') {
        // Create main dashboard if it doesn't exist
        const newDashboard = { ...DEFAULT_DASHBOARD, ...updates }
        fallbackDashboards.push(newDashboard)
        return newDashboard
      }
      return null
    }
  },

  // Column data management
  setColumnData: async (columnId: string, items: NewsItem[]) => {
    if (isKVAvailable()) {
      await kv.set(KEYS.COLUMN_DATA(columnId), items)
    } else {
      // Fallback to in-memory
      fallbackColumnData.set(columnId, items)
    }
  },

  getColumnData: async (columnId: string) => {
    if (isKVAvailable()) {
      return await kv.get<NewsItem[]>(KEYS.COLUMN_DATA(columnId)) || []
    } else {
      return fallbackColumnData.get(columnId) || []
    }
  },

  // Column management
  addColumnToDashboard: async (dashboardId: string, column: DashboardColumn) => {
    const dashboard = await persistentDb.getDashboard(dashboardId)
    if (dashboard) {
      const updatedColumns = [...dashboard.columns, column]
      return await persistentDb.updateDashboard(dashboardId, { columns: updatedColumns })
    }
    return null
  },

  removeColumnFromDashboard: async (dashboardId: string, columnId: string) => {
    const dashboard = await persistentDb.getDashboard(dashboardId)
    if (dashboard) {
      const updatedColumns = dashboard.columns.map(col => 
        col.id === columnId 
          ? { ...col, isArchived: true, archivedAt: new Date().toISOString() }
          : col
      )
      
      return await persistentDb.updateDashboard(dashboardId, { columns: updatedColumns })
    }
    return null
  },

  restoreColumnInDashboard: async (dashboardId: string, columnId: string) => {
    const dashboard = await persistentDb.getDashboard(dashboardId)
    if (dashboard) {
      const updatedColumns = dashboard.columns.map(col => 
        col.id === columnId 
          ? { ...col, isArchived: false, archivedAt: undefined }
          : col
      )
      
      return await persistentDb.updateDashboard(dashboardId, { columns: updatedColumns })
    }
    return null
  },

  getArchivedColumns: async (dashboardId: string) => {
    const dashboard = await persistentDb.getDashboard(dashboardId)
    if (dashboard) {
      return dashboard.columns.filter(col => col.isArchived === true)
    }
    return []
  },

  // Get news items for specific workflow (for column-based dashboards)
  getNewsItemsByWorkflow: async (workflowId: string) => {
    const items = await persistentDb.getNewsItems()
    return items
      .filter(item => item.workflowId === workflowId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  // Get news items for multiple workflows
  getNewsItemsByWorkflows: async (workflowIds: string[]) => {
    const items = await persistentDb.getNewsItems()
    return items
      .filter(item => workflowIds.includes(item.workflowId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  // Get unique values for admin interface
  getUniqueWorkflowIds: async () => {
    const items = await persistentDb.getNewsItems()
    return Array.from(new Set(items.map(item => item.workflowId)))
  },

  getUniqueSources: async () => {
    const items = await persistentDb.getNewsItems()
    return Array.from(new Set(items.map(item => item.source)))
  },

  getUniqueMunicipalities: async () => {
    const items = await persistentDb.getNewsItems()
    return Array.from(new Set(items
      .map(item => item.location?.municipality)
      .filter(Boolean)
    ))
  },

  // Utility functions
  clearAllData: async () => {
    if (isKVAvailable()) {
      // This is a destructive operation, use with caution
      await kv.flushall()
    } else {
      fallbackNewsItems = []
      fallbackDashboards = []
      fallbackColumnData.clear()
    }
  },

  // Health check
  isConnected: () => {
    return isKVAvailable()
  }
}