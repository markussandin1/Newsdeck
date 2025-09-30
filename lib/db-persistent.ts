import { kv } from '@vercel/kv'
import { NewsItem, Dashboard, DashboardColumn } from './types'
import { v4 as uuidv4 } from 'uuid'
import { logger } from './logger'

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
  isDefault: true,
  createdBy: 'system',
  createdByName: 'System'
}

// Fallback to in-memory storage if KV is not available (for local development)
let fallbackNewsItems: NewsItem[] = []
let fallbackDashboards: Dashboard[] = []
const fallbackColumnData = new Map<string, NewsItem[]>()

const isKVAvailable = () => {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

export const persistentDb = {
  // News items
  addNewsItem: async (item: NewsItem) => {
    // Add database creation timestamp
    const itemWithTimestamp = {
      ...item,
      createdInDb: new Date().toISOString()
    }

    if (isKVAvailable()) {
      const existing = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
      const updated = [...existing, itemWithTimestamp]
      await kv.set(KEYS.NEWS_ITEMS, updated)
      return itemWithTimestamp
    } else {
      // Fallback to in-memory
      fallbackNewsItems.push(itemWithTimestamp)
      return itemWithTimestamp
    }
  },

  addNewsItems: async (items: NewsItem[]) => {
    // Add database creation timestamp to items that don't already have it
    const itemsWithTimestamp = items.map(item => ({
      ...item,
      createdInDb: item.createdInDb || new Date().toISOString()
    }))

    if (isKVAvailable()) {
      const existing = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
      const updated = [...existing, ...itemsWithTimestamp]
      await kv.set(KEYS.NEWS_ITEMS, updated)
      return itemsWithTimestamp
    } else {
      // Fallback to in-memory
      fallbackNewsItems.push(...itemsWithTimestamp)
      return itemsWithTimestamp
    }
  },

  getNewsItems: async () => {
    if (isKVAvailable()) {
      let items = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []

      // Migration: Add dbId to items that don't have it
      let needsUpdate = false
      items = items.map(item => {
        if (!item.dbId) {
          needsUpdate = true
          return { ...item, dbId: uuidv4() }
        }
        return item
      })

      if (needsUpdate) {
        await kv.set(KEYS.NEWS_ITEMS, items)
        logger.info('db.items.migratedMissingDbId', { count: items.length })
      }

      return items.sort((a, b) => {
        // Sort by createdInDb (when event was added to database), fallback to timestamp
        const timeA = new Date(a.createdInDb || a.timestamp).getTime()
        const timeB = new Date(b.createdInDb || b.timestamp).getTime()
        return timeB - timeA
      })
    } else {
      // Migration for fallback storage
      let needsUpdate = false
      fallbackNewsItems.forEach(item => {
        if (!item.dbId) {
          item.dbId = uuidv4()
          needsUpdate = true
        }
      })

      if (needsUpdate) {
        logger.info('db.items.migratedFallbackDbId', { count: fallbackNewsItems.length })
      }

      return [...fallbackNewsItems].sort((a, b) => {
        // Sort by createdInDb (when event was added to database), fallback to timestamp
        const timeA = new Date(a.createdInDb || a.timestamp).getTime()
        const timeB = new Date(b.createdInDb || b.timestamp).getTime()
        return timeB - timeA
      })
    }
  },

  getRecentNewsItems: async (limit = 10) => {
    const items = await persistentDb.getNewsItems()
    return items.slice(0, limit)
  },

  deleteNewsItem: async (dbId: string) => {
    logger.debug('db.deleteNewsItem.start', { dbId, kvAvailable: isKVAvailable() })

    if (isKVAvailable()) {
      const items = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []

      const initialLength = items.length
      const filteredItems = items.filter(item => item.dbId !== dbId)
      const deletedCount = initialLength - filteredItems.length

      if (deletedCount === 0) {
        logger.warn('db.deleteNewsItem.notFound', { dbId })
        return false
      }

      await kv.set(KEYS.NEWS_ITEMS, filteredItems)
      logger.info('db.deleteNewsItem.removedFromGeneral', { dbId, deletedCount, remaining: filteredItems.length })

      // Also remove from all column data
      const dashboards = await kv.get<Dashboard[]>(KEYS.DASHBOARDS) || []

      let columnsChecked = 0
      let columnsUpdated = 0

      for (const dashboard of dashboards) {
        for (const column of dashboard.columns || []) {
          columnsChecked++
          const columnItems = await kv.get<NewsItem[]>(KEYS.COLUMN_DATA(column.id)) || []
          const columnInitialLength = columnItems.length
          const filteredColumnItems = columnItems.filter(item => item.dbId !== dbId)
          const columnDeletedCount = columnInitialLength - filteredColumnItems.length

          if (columnDeletedCount > 0) {
            await kv.set(KEYS.COLUMN_DATA(column.id), filteredColumnItems)
            columnsUpdated++
            logger.info('db.deleteNewsItem.removedFromColumn', {
              dbId,
              columnId: column.id,
              columnTitle: column.title,
              deletedCount: columnDeletedCount,
              remaining: filteredColumnItems.length
            })
          }
        }
      }

      logger.debug('db.deleteNewsItem.columnSweep', { columnsChecked, columnsUpdated })
      return true
    } else {
      // Fallback to in-memory
      logger.debug('db.deleteNewsItem.fallbackStart', { dbId })

      const originalLength = fallbackNewsItems.length
      fallbackNewsItems.splice(0, fallbackNewsItems.length, ...fallbackNewsItems.filter(item => item.dbId !== dbId))
      const deletedFallbackCount = originalLength - fallbackNewsItems.length

      if (deletedFallbackCount === 0) {
        logger.warn('db.deleteNewsItem.fallbackNotFound', { dbId })
        return false
      }

      logger.info('db.deleteNewsItem.fallbackRemoved', { dbId, deletedCount: deletedFallbackCount, remaining: fallbackNewsItems.length })

      // Also remove from column data
      let columnsChecked = 0
      let columnsUpdated = 0

      fallbackColumnData.forEach((items, columnId) => {
        columnsChecked++
        const columnInitialLength = items.length
        const filteredItems = items.filter(item => item.dbId !== dbId)
        const columnDeletedCount = columnInitialLength - filteredItems.length

        if (columnDeletedCount > 0) {
          items.splice(0, items.length, ...filteredItems)
          columnsUpdated++
          logger.info('db.deleteNewsItem.fallbackColumnRemoved', {
            dbId,
            columnId,
            deletedCount: columnDeletedCount,
            remaining: items.length
          })
        }
      })

      logger.debug('db.deleteNewsItem.fallbackColumnSweep', { columnsChecked, columnsUpdated })
      return true
    }
  },

  // Get news items with pagination support
  getNewsItemsPaginated: async (limit = 50, offset = 0) => {
    if (isKVAvailable()) {
      const items = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
      return items
        .sort((a, b) => {
          const timeA = new Date(a.createdInDb || a.timestamp).getTime()
          const timeB = new Date(b.createdInDb || b.timestamp).getTime()
          return timeB - timeA
        })
        .slice(offset, offset + limit)
    } else {
      return [...fallbackNewsItems]
        .sort((a, b) => {
          const timeA = new Date(a.createdInDb || a.timestamp).getTime()
          const timeB = new Date(b.createdInDb || b.timestamp).getTime()
          return timeB - timeA
        })
        .slice(offset, offset + limit)
    }
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
      // Ensure we always have at least the main dashboard
      if (fallbackDashboards.length === 0) {
        fallbackDashboards.push(DEFAULT_DASHBOARD)
      }
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
  createDashboard: async (name: string, description?: string, createdBy?: string, createdByName?: string) => {
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
      createdBy: createdBy || 'system',
      createdByName: createdByName || 'System',
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

  getColumnData: async (columnId: string, limit?: number) => {
    if (isKVAvailable()) {
      const items = await kv.get<NewsItem[]>(KEYS.COLUMN_DATA(columnId)) || []
      // Apply limit if specified (no default limit - return all items)
      return limit ? items.slice(0, limit) : items
    } else {
      const items = fallbackColumnData.get(columnId) || []
      // Apply limit if specified (no default limit - return all items)
      return limit ? items.slice(0, limit) : items
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
      .sort((a, b) => {
        // Sort by createdInDb (when event was added to database), fallback to timestamp
        const timeA = new Date(a.createdInDb || a.timestamp).getTime()
        const timeB = new Date(b.createdInDb || b.timestamp).getTime()
        return timeB - timeA
      })
  },

  // Get news items for multiple workflows
  getNewsItemsByWorkflows: async (workflowIds: string[]) => {
    const items = await persistentDb.getNewsItems()
    return items
      .filter(item => workflowIds.includes(item.workflowId))
      .sort((a, b) => {
        // Sort by createdInDb (when event was added to database), fallback to timestamp
        const timeA = new Date(a.createdInDb || a.timestamp).getTime()
        const timeB = new Date(b.createdInDb || b.timestamp).getTime()
        return timeB - timeA
      })
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

  // Cleanup old news items (performance optimization)
  cleanupOldItems: async (olderThanDays = 7) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    const cutoffTime = cutoffDate.getTime()

    let removedCount = 0

    if (isKVAvailable()) {
      // Clean up main news items
      const items = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
      const filteredItems = items.filter(item => {
        const itemTime = new Date(item.createdInDb || item.timestamp).getTime()
        const isOld = itemTime < cutoffTime
        if (isOld) removedCount++
        return !isOld
      })

      if (removedCount > 0) {
        await kv.set(KEYS.NEWS_ITEMS, filteredItems)
      }

      // Clean up column data
      const dashboards = await kv.get<Dashboard[]>(KEYS.DASHBOARDS) || []
      for (const dashboard of dashboards) {
        for (const column of dashboard.columns || []) {
          const columnItems = await kv.get<NewsItem[]>(KEYS.COLUMN_DATA(column.id)) || []
          const filteredColumnItems = columnItems.filter(item => {
            const itemTime = new Date(item.createdInDb || item.timestamp).getTime()
            return itemTime >= cutoffTime
          })

          if (filteredColumnItems.length !== columnItems.length) {
            await kv.set(KEYS.COLUMN_DATA(column.id), filteredColumnItems)
          }
        }
      }
    } else {
      // Clean up fallback data
      fallbackNewsItems = fallbackNewsItems.filter(item => {
        const itemTime = new Date(item.createdInDb || item.timestamp).getTime()
        const isOld = itemTime < cutoffTime
        if (isOld) removedCount++
        return !isOld
      })

      // Clean up column data
      fallbackColumnData.forEach((items, columnId) => {
        const filteredItems = items.filter(item => {
          const itemTime = new Date(item.createdInDb || item.timestamp).getTime()
          return itemTime >= cutoffTime
        })
        fallbackColumnData.set(columnId, filteredItems)
      })
    }

    return { success: true, removedCount, cutoffDate: cutoffDate.toISOString() }
  },

  // Migration: Add createdInDb to existing items
  migrateCreatedInDb: async () => {
    let updated = 0

    if (isKVAvailable()) {
      const items = await kv.get<NewsItem[]>(KEYS.NEWS_ITEMS) || []
      const migratedItems = items.map(item => {
        if (!item.createdInDb) {
          updated++
          return {
            ...item,
            createdInDb: item.timestamp // Use original timestamp as fallback
          }
        }
        return item
      })

      if (updated > 0) {
        await kv.set(KEYS.NEWS_ITEMS, migratedItems)
        logger.info('db.items.migratedCreatedInDb', { updated })
      }
    } else {
      // Fallback to in-memory
      fallbackNewsItems = fallbackNewsItems.map(item => {
        if (!item.createdInDb) {
          updated++
          return {
            ...item,
            createdInDb: item.timestamp // Use original timestamp as fallback
          }
        }
        return item
      })
    }

    return { success: true, updated }
  },

  // Sync column data from general news storage (for fixing data inconsistencies)
  syncColumnDataFromGeneral: async (columnId: string) => {
    const allItems = await persistentDb.getNewsItems()
    const columnItems = allItems.filter(item => item.workflowId === columnId)

    logger.debug('db.syncColumnData.start', { columnId, count: columnItems.length })

    await persistentDb.setColumnData(columnId, columnItems)

    logger.info('db.syncColumnData.completed', { columnId, updated: columnItems.length })

    return { success: true, itemsFound: columnItems.length, columnId }
  },

  // Sync all columns data from general news storage
  syncAllColumnsDataFromGeneral: async () => {
    const dashboards = await persistentDb.getDashboards()
    let totalSynced = 0

    for (const dashboard of dashboards) {
      if (dashboard.columns) {
        for (const column of dashboard.columns.filter(col => !col.isArchived)) {
          const result = await persistentDb.syncColumnDataFromGeneral(column.id)
          totalSynced += result.itemsFound
        }
      }
    }

    logger.info('db.syncColumnDataAll.completed', { totalSynced })

    return { success: true, totalItemsSynced: totalSynced }
  },

  // User preferences (not supported in KV version)
  getUserPreferences: async (userId: string) => {
    logger.warn('db.getUserPreferences.notSupported', { userId })
    return null
  },

  setUserPreferences: async (userId: string, _preferences: { defaultDashboardId?: string }) => {
    logger.warn('db.setUserPreferences.notSupported', { userId })
    return null
  },

  // Dashboard follows (not supported in KV version)
  getUserDashboardFollows: async (userId: string) => {
    logger.warn('db.getUserDashboardFollows.notSupported', { userId })
    return []
  },

  getDashboardFollowers: async (dashboardId: string) => {
    logger.warn('db.getDashboardFollowers.notSupported', { dashboardId })
    return []
  },

  followDashboard: async (userId: string, dashboardId: string) => {
    logger.warn('db.followDashboard.notSupported', { userId, dashboardId })
    return { success: false }
  },

  unfollowDashboard: async (userId: string, dashboardId: string) => {
    logger.warn('db.unfollowDashboard.notSupported', { userId, dashboardId })
    return { success: false }
  },

  // Health check
  isConnected: () => {
    return isKVAvailable()
  }
}
