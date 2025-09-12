import { Redis } from '@upstash/redis'
import { NewsItem, Dashboard, DashboardColumn } from './types'

// Initialize Upstash Redis client
const redis = Redis.fromEnv()

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
  name: 'Newsdeck',
  columns: [],
  createdAt: new Date().toISOString(),
  viewCount: 0
}

// Fallback to in-memory storage if Redis is not available (for local development)
let fallbackNewsItems: NewsItem[] = []
let fallbackDashboards: Dashboard[] = []
let fallbackColumnData = new Map<string, NewsItem[]>()

const isRedisAvailable = () => {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
}

export const upstashDb = {
  // News items
  addNewsItem: async (item: NewsItem) => {
    if (isRedisAvailable()) {
      try {
        const existing = await redis.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
        const updated = [...existing, item]
        await redis.set(KEYS.NEWS_ITEMS, updated)
        return item
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        fallbackNewsItems.push(item)
        return item
      }
    } else {
      // Fallback to in-memory
      fallbackNewsItems.push(item)
      return item
    }
  },

  addNewsItems: async (items: NewsItem[]) => {
    if (isRedisAvailable()) {
      try {
        const existing = await redis.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
        const updated = [...existing, ...items]
        await redis.set(KEYS.NEWS_ITEMS, updated)
        return items
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        fallbackNewsItems.push(...items)
        return items
      }
    } else {
      // Fallback to in-memory
      fallbackNewsItems.push(...items)
      return items
    }
  },

  getNewsItems: async () => {
    if (isRedisAvailable()) {
      try {
        const items = await redis.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
        return items.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        return [...fallbackNewsItems].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      }
    } else {
      return [...fallbackNewsItems].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    }
  },

  getRecentNewsItems: async (limit = 10) => {
    const items = await upstashDb.getNewsItems()
    return items.slice(0, limit)
  },

  // Dashboards
  addDashboard: async (dashboard: Dashboard) => {
    if (isRedisAvailable()) {
      try {
        const existing = await redis.get<Dashboard[]>(KEYS.DASHBOARDS) || []
        const updated = [...existing, dashboard]
        await redis.set(KEYS.DASHBOARDS, updated)
        await redis.set(KEYS.DASHBOARD(dashboard.id), dashboard)
        return dashboard
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        fallbackDashboards.push(dashboard)
        return dashboard
      }
    } else {
      // Fallback to in-memory
      fallbackDashboards.push(dashboard)
      return dashboard
    }
  },

  getDashboards: async () => {
    if (isRedisAvailable()) {
      try {
        const dashboards = await redis.get<Dashboard[]>(KEYS.DASHBOARDS) || []
        return dashboards.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        return [...fallbackDashboards].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }
    } else {
      return [...fallbackDashboards].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
  },

  getDashboard: async (id: string) => {
    if (id === 'main-dashboard') {
      // Always return the main dashboard, merge with any stored version
      if (isRedisAvailable()) {
        try {
          const stored = await redis.get<Dashboard>(KEYS.DASHBOARD('main-dashboard'))
          return stored || DEFAULT_DASHBOARD
        } catch (error) {
          console.error('Redis error, falling back to memory:', error)
          return fallbackDashboards.find(d => d.id === 'main-dashboard') || DEFAULT_DASHBOARD
        }
      } else {
        return fallbackDashboards.find(d => d.id === 'main-dashboard') || DEFAULT_DASHBOARD
      }
    }

    if (isRedisAvailable()) {
      try {
        return await redis.get<Dashboard>(KEYS.DASHBOARD(id))
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        return fallbackDashboards.find(d => d.id === id)
      }
    } else {
      return fallbackDashboards.find(d => d.id === id)
    }
  },

  // Get or create the main dashboard
  getMainDashboard: async () => {
    let main = await upstashDb.getDashboard('main-dashboard')
    if (!main) {
      main = { ...DEFAULT_DASHBOARD }
      await upstashDb.addDashboard(main)
    }
    return main
  },

  updateDashboard: async (id: string, updates: Partial<Dashboard>) => {
    if (isRedisAvailable()) {
      try {
        const existing = await redis.get<Dashboard>(KEYS.DASHBOARD(id))
        if (existing) {
          const updated = { ...existing, ...updates }
          await redis.set(KEYS.DASHBOARD(id), updated)
          
          // Update in dashboards list
          const allDashboards = await redis.get<Dashboard[]>(KEYS.DASHBOARDS) || []
          const index = allDashboards.findIndex(d => d.id === id)
          if (index !== -1) {
            allDashboards[index] = updated
            await redis.set(KEYS.DASHBOARDS, allDashboards)
          }
          return updated
        } else if (id === 'main-dashboard') {
          // Create main dashboard if it doesn't exist
          const newDashboard = { ...DEFAULT_DASHBOARD, ...updates }
          await upstashDb.addDashboard(newDashboard)
          return newDashboard
        }
        return null
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        const index = fallbackDashboards.findIndex(d => d.id === id)
        if (index !== -1) {
          fallbackDashboards[index] = { ...fallbackDashboards[index], ...updates }
          return fallbackDashboards[index]
        } else if (id === 'main-dashboard') {
          const newDashboard = { ...DEFAULT_DASHBOARD, ...updates }
          fallbackDashboards.push(newDashboard)
          return newDashboard
        }
        return null
      }
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
    if (isRedisAvailable()) {
      try {
        await redis.set(KEYS.COLUMN_DATA(columnId), items)
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        fallbackColumnData.set(columnId, items)
      }
    } else {
      // Fallback to in-memory
      fallbackColumnData.set(columnId, items)
    }
  },

  getColumnData: async (columnId: string) => {
    if (isRedisAvailable()) {
      try {
        return await redis.get<NewsItem[]>(KEYS.COLUMN_DATA(columnId)) || []
      } catch (error) {
        console.error('Redis error, falling back to memory:', error)
        return fallbackColumnData.get(columnId) || []
      }
    } else {
      return fallbackColumnData.get(columnId) || []
    }
  },

  // Column management
  addColumnToDashboard: async (dashboardId: string, column: DashboardColumn) => {
    const dashboard = await upstashDb.getDashboard(dashboardId)
    if (dashboard) {
      const updatedColumns = [...dashboard.columns, column]
      return await upstashDb.updateDashboard(dashboardId, { columns: updatedColumns })
    }
    return null
  },

  removeColumnFromDashboard: async (dashboardId: string, columnId: string) => {
    const dashboard = await upstashDb.getDashboard(dashboardId)
    if (dashboard) {
      const updatedColumns = dashboard.columns.filter(col => col.id !== columnId)
      
      // Also clear column data
      if (isRedisAvailable()) {
        try {
          await redis.del(KEYS.COLUMN_DATA(columnId))
        } catch (error) {
          console.error('Redis error:', error)
          fallbackColumnData.delete(columnId)
        }
      } else {
        fallbackColumnData.delete(columnId)
      }
      
      return await upstashDb.updateDashboard(dashboardId, { columns: updatedColumns })
    }
    return null
  },

  // Get news items for specific workflow (for column-based dashboards)
  getNewsItemsByWorkflow: async (workflowId: string) => {
    const items = await upstashDb.getNewsItems()
    return items
      .filter(item => item.workflowId === workflowId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  // Get news items for multiple workflows
  getNewsItemsByWorkflows: async (workflowIds: string[]) => {
    const items = await upstashDb.getNewsItems()
    return items
      .filter(item => workflowIds.includes(item.workflowId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  // Get unique values for admin interface
  getUniqueWorkflowIds: async () => {
    const items = await upstashDb.getNewsItems()
    return Array.from(new Set(items.map(item => item.workflowId)))
  },

  getUniqueSources: async () => {
    const items = await upstashDb.getNewsItems()
    return Array.from(new Set(items.map(item => item.source)))
  },

  getUniqueMunicipalities: async () => {
    const items = await upstashDb.getNewsItems()
    return Array.from(new Set(items
      .map(item => item.location?.municipality)
      .filter(Boolean)
    ))
  },

  // Utility functions
  clearAllData: async () => {
    if (isRedisAvailable()) {
      try {
        // This is a destructive operation, use with caution
        await redis.flushall()
      } catch (error) {
        console.error('Redis error:', error)
      }
    }
    // Always clear fallback data
    fallbackNewsItems = []
    fallbackDashboards = []
    fallbackColumnData.clear()
  },

  // Health check
  isConnected: () => {
    return isRedisAvailable()
  }
}