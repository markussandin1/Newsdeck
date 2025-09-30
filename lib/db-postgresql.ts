import { Pool } from 'pg'
import { parse as parseConnectionString } from 'pg-connection-string'
import { NewsItem, Dashboard, DashboardColumn } from './types'
import { logger } from './logger'

// PostgreSQL connection pool
let pool: Pool | null = null

const getPool = () => {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL

    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    // Parse DATABASE_URL to handle Cloud SQL Unix socket format
    // Format: postgresql://user:pass@/cloudsql/instance/dbname
    let config: {
      user?: string | null
      password?: string | null
      host?: string | null
      database?: string | null
      port?: string | number | null
    }

    // Check if it's a Unix socket connection (starts with @/cloudsql/)
    if (DATABASE_URL.includes('@/cloudsql/')) {
      // Manual parsing for Unix socket format
      const match = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@(\/cloudsql\/[^\/]+)\/(.+)/)
      if (match) {
        config = {
          user: match[1],
          password: match[2],
          host: match[3],
          database: match[4],
        }
      } else {
        config = parseConnectionString(DATABASE_URL)
      }
    } else {
      config = parseConnectionString(DATABASE_URL)
    }

    const poolConfig: {
      user?: string
      password?: string
      database?: string
      host?: string
      port?: number
      ssl?: boolean | { rejectUnauthorized: boolean }
      max: number
      idleTimeoutMillis: number
      connectionTimeoutMillis: number
    } = {
      user: config.user ?? undefined,
      password: config.password ?? undefined,
      database: config.database ?? undefined,
      host: config.host ?? undefined,
      port: config.port ? parseInt(config.port.toString()) : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }

    // Only add SSL for non-Unix socket connections
    if (!config.host || !config.host.startsWith('/cloudsql/')) {
      poolConfig.ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }

    pool = new Pool(poolConfig)

    pool.on('error', (err) => {
      logger.error('db.pool.unexpectedError', { error: err.message })
    })
  }

  return pool
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

export const persistentDb = {
  // News items
  addNewsItem: async (item: NewsItem) => {
    const pool = getPool()
    const itemWithTimestamp = {
      ...item,
      createdInDb: new Date().toISOString()
    }

    try {
      await pool.query(
        `INSERT INTO news_items (
          id, workflow_id, source, timestamp, title, description,
          news_value, category, severity, location, extra, raw, created_in_db
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          workflow_id = EXCLUDED.workflow_id,
          source = EXCLUDED.source,
          timestamp = EXCLUDED.timestamp,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          news_value = EXCLUDED.news_value,
          category = EXCLUDED.category,
          severity = EXCLUDED.severity,
          location = EXCLUDED.location,
          extra = EXCLUDED.extra,
          raw = EXCLUDED.raw`,
        [
          item.id,
          item.workflowId,
          item.source,
          item.timestamp,
          item.title,
          item.description || null,
          item.newsValue,
          item.category || null,
          item.severity || null,
          JSON.stringify(item.location || {}),
          JSON.stringify(item.extra || {}),
          JSON.stringify(item.raw || {}),
          itemWithTimestamp.createdInDb
        ]
      )
      return itemWithTimestamp
    } catch (error) {
      logger.error('db.addNewsItem.error', { error, itemId: item.id })
      throw error
    }
  },

  addNewsItems: async (items: NewsItem[]) => {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const itemsWithTimestamp = items.map(item => ({
        ...item,
        createdInDb: item.createdInDb || new Date().toISOString()
      }))

      for (const item of itemsWithTimestamp) {
        await client.query(
          `INSERT INTO news_items (
            id, workflow_id, source, timestamp, title, description,
            news_value, category, severity, location, extra, raw, created_in_db
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            workflow_id = EXCLUDED.workflow_id,
            source = EXCLUDED.source,
            timestamp = EXCLUDED.timestamp,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            news_value = EXCLUDED.news_value,
            category = EXCLUDED.category,
            severity = EXCLUDED.severity,
            location = EXCLUDED.location,
            extra = EXCLUDED.extra,
            raw = EXCLUDED.raw`,
          [
            item.id,
            item.workflowId,
            item.source,
            item.timestamp,
            item.title,
            item.description || null,
            item.newsValue,
            item.category || null,
            item.severity || null,
            JSON.stringify(item.location || {}),
            JSON.stringify(item.extra || {}),
            JSON.stringify(item.raw || {}),
            item.createdInDb
          ]
        )
      }

      await client.query('COMMIT')
      return itemsWithTimestamp
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('db.addNewsItems.error', { error, count: items.length })
      throw error
    } finally {
      client.release()
    }
  },

  getNewsItems: async () => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          id, workflow_id as "workflowId", source, timestamp, title, description,
          news_value as "newsValue", category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          id as "dbId"
        FROM news_items
        ORDER BY created_in_db DESC, timestamp DESC`
      )

      return result.rows.map(row => ({
        ...row,
        location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
        extra: typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra,
        raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
      }))
    } catch (error) {
      logger.error('db.getNewsItems.error', { error })
      throw error
    }
  },

  getRecentNewsItems: async (limit = 10) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          id, workflow_id as "workflowId", source, timestamp, title, description,
          news_value as "newsValue", category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          id as "dbId"
        FROM news_items
        ORDER BY created_in_db DESC, timestamp DESC
        LIMIT $1`,
        [limit]
      )

      return result.rows.map(row => ({
        ...row,
        location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
        extra: typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra,
        raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
      }))
    } catch (error) {
      logger.error('db.getRecentNewsItems.error', { error })
      throw error
    }
  },

  deleteNewsItem: async (dbId: string) => {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Delete from news_items table
      const deleteResult = await client.query(
        'DELETE FROM news_items WHERE id = $1',
        [dbId]
      )

      if (deleteResult.rowCount === 0) {
        logger.warn('db.deleteNewsItem.notFound', { dbId })
        await client.query('ROLLBACK')
        return false
      }

      // Delete from column_data table
      await client.query(
        'DELETE FROM column_data WHERE news_item_id = $1',
        [dbId]
      )

      await client.query('COMMIT')
      logger.info('db.deleteNewsItem.success', { dbId })
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('db.deleteNewsItem.error', { error, dbId })
      throw error
    } finally {
      client.release()
    }
  },

  getNewsItemsPaginated: async (limit = 50, offset = 0) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          id, workflow_id as "workflowId", source, timestamp, title, description,
          news_value as "newsValue", category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          id as "dbId"
        FROM news_items
        ORDER BY created_in_db DESC, timestamp DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      return result.rows.map(row => ({
        ...row,
        location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
        extra: typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra,
        raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
      }))
    } catch (error) {
      logger.error('db.getNewsItemsPaginated.error', { error })
      throw error
    }
  },

  // Dashboards
  addDashboard: async (dashboard: Dashboard) => {
    const pool = getPool()

    try {
      await pool.query(
        `INSERT INTO dashboards (
          id, name, slug, columns, view_count, last_viewed, created_at, created_by, created_by_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          columns = EXCLUDED.columns,
          view_count = EXCLUDED.view_count,
          last_viewed = EXCLUDED.last_viewed,
          created_by = EXCLUDED.created_by,
          created_by_name = EXCLUDED.created_by_name`,
        [
          dashboard.id,
          dashboard.name,
          dashboard.slug,
          JSON.stringify(dashboard.columns || []),
          dashboard.viewCount || 0,
          dashboard.lastViewed || null,
          dashboard.createdAt,
          dashboard.createdBy,
          dashboard.createdByName
        ]
      )

      return dashboard
    } catch (error) {
      logger.error('db.addDashboard.error', { error, dashboardId: dashboard.id })
      throw error
    }
  },

  getDashboards: async () => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          id, name, slug, columns, view_count as "viewCount",
          last_viewed as "lastViewed", created_at as "createdAt",
          created_by as "createdBy", created_by_name as "createdByName"
        FROM dashboards
        ORDER BY created_at DESC`
      )

      return result.rows.map(row => ({
        ...row,
        columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns
      }))
    } catch (error) {
      logger.error('db.getDashboards.error', { error })
      throw error
    }
  },

  getDashboard: async (id: string) => {
    const pool = getPool()

    if (id === 'main-dashboard') {
      try {
        const result = await pool.query(
          `SELECT
            id, name, slug, columns, view_count as "viewCount",
            last_viewed as "lastViewed", created_at as "createdAt"
          FROM dashboards
          WHERE id = $1`,
          [id]
        )

        if (result.rows.length > 0) {
          const row = result.rows[0]
          return {
            ...row,
            filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
            columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : (row.columns || [])
          }
        }

        // Create default dashboard if it doesn't exist
        await persistentDb.addDashboard(DEFAULT_DASHBOARD)
        return DEFAULT_DASHBOARD
      } catch (error) {
        logger.error('db.getDashboard.mainError', { error })
        throw error
      }
    }

    try {
      const result = await pool.query(
        `SELECT
          id, name, slug, columns, view_count as "viewCount",
          last_viewed as "lastViewed", created_at as "createdAt"
        FROM dashboards
        WHERE id = $1`,
        [id]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        ...row,
        filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
        columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : (row.columns || [])
      }
    } catch (error) {
      logger.error('db.getDashboard.error', { error, id })
      throw error
    }
  },

  getMainDashboard: async () => {
    return await persistentDb.getDashboard('main-dashboard')
  },

  getDashboardBySlug: async (slug: string) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          id, name, slug, columns, view_count as "viewCount",
          last_viewed as "lastViewed", created_at as "createdAt"
        FROM dashboards
        WHERE slug = $1`,
        [slug]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        ...row,
        filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
        columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : (row.columns || [])
      }
    } catch (error) {
      logger.error('db.getDashboardBySlug.error', { error, slug })
      throw error
    }
  },

  createDashboard: async (name: string, description?: string, createdBy?: string, createdByName?: string) => {
    const { generateSlug, ensureUniqueSlug } = await import('./utils')

    const existingDashboards = await persistentDb.getDashboards()
    const existingSlugs = existingDashboards.map(d => d.slug)

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
    const pool = getPool()

    try {
      const existing = await persistentDb.getDashboard(id)

      if (!existing && id === 'main-dashboard') {
        const newDashboard = { ...DEFAULT_DASHBOARD, ...updates }
        await persistentDb.addDashboard(newDashboard)
        return newDashboard
      }

      if (!existing) {
        return null
      }

      const updated = { ...existing, ...updates }

      await pool.query(
        `UPDATE dashboards SET
          name = $1,
          slug = $2,
          columns = $3,
          view_count = $4,
          last_viewed = $5
        WHERE id = $6`,
        [
          updated.name,
          updated.slug,
          JSON.stringify(updated.columns || []),
          updated.viewCount || 0,
          updated.lastViewed || null,
          id
        ]
      )

      return updated
    } catch (error) {
      logger.error('db.updateDashboard.error', { error, id })
      throw error
    }
  },

  // Column data management
  setColumnData: async (columnId: string, items: NewsItem[]) => {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // First, check if column_data table has the new schema (db_id primary key)
      const schemaCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'column_data' AND column_name = 'db_id'
      `)

      const hasNewSchema = schemaCheck.rows.length > 0

      if (!hasNewSchema) {
        // Migrate schema if needed
        await client.query('DROP TABLE IF EXISTS column_data')
        await client.query(`
          CREATE TABLE column_data (
            db_id UUID PRIMARY KEY,
            column_id UUID NOT NULL,
            news_item_id TEXT NOT NULL,
            data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL
          )
        `)
        await client.query('CREATE INDEX idx_column_data_column_id ON column_data(column_id)')
        await client.query('CREATE INDEX idx_column_data_created_at ON column_data(created_at DESC)')
        logger.info('db.setColumnData.schemaMigrated', { columnId })
      }

      // Clear existing column data
      await client.query(
        'DELETE FROM column_data WHERE column_id = $1',
        [columnId]
      )

      // Insert new items using dbId as primary key (allows duplicate news_item_id)
      for (const item of items) {
        await client.query(
          `INSERT INTO column_data (db_id, column_id, news_item_id, data, created_at)
          VALUES ($1, $2, $3, $4, $5)`,
          [item.dbId, columnId, item.id, JSON.stringify(item), new Date().toISOString()]
        )
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('db.setColumnData.error', { error, columnId })
      throw error
    } finally {
      client.release()
    }
  },

  getColumnData: async (columnId: string, limit?: number) => {
    const pool = getPool()

    try {
      const query = limit
        ? 'SELECT data FROM column_data WHERE column_id = $1 ORDER BY created_at DESC LIMIT $2'
        : 'SELECT data FROM column_data WHERE column_id = $1 ORDER BY created_at DESC'

      const params = limit ? [columnId, limit] : [columnId]
      const result = await pool.query(query, params)

      return result.rows.map(row => {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        return data
      })
    } catch (error) {
      logger.error('db.getColumnData.error', { error, columnId })
      throw error
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
      const updatedColumns = dashboard.columns.map((col: DashboardColumn) =>
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
      const updatedColumns = dashboard.columns.map((col: DashboardColumn) =>
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
      return dashboard.columns.filter((col: DashboardColumn) => col.isArchived === true)
    }
    return []
  },

  // Get news items for specific workflow
  getNewsItemsByWorkflow: async (workflowId: string) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          id, workflow_id as "workflowId", source, timestamp, title, description,
          news_value as "newsValue", category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          id as "dbId"
        FROM news_items
        WHERE workflow_id = $1
        ORDER BY created_in_db DESC, timestamp DESC`,
        [workflowId]
      )

      return result.rows.map(row => ({
        ...row,
        location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
        extra: typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra,
        raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
      }))
    } catch (error) {
      logger.error('db.getNewsItemsByWorkflow.error', { error, workflowId })
      throw error
    }
  },

  // Get news items for multiple workflows
  getNewsItemsByWorkflows: async (workflowIds: string[]) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          id, workflow_id as "workflowId", source, timestamp, title, description,
          news_value as "newsValue", category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          id as "dbId"
        FROM news_items
        WHERE workflow_id = ANY($1)
        ORDER BY created_in_db DESC, timestamp DESC`,
        [workflowIds]
      )

      return result.rows.map(row => ({
        ...row,
        location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
        extra: typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra,
        raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
      }))
    } catch (error) {
      logger.error('db.getNewsItemsByWorkflows.error', { error })
      throw error
    }
  },

  // Get unique values for admin interface
  getUniqueWorkflowIds: async () => {
    const pool = getPool()

    try {
      const result = await pool.query(
        'SELECT DISTINCT workflow_id FROM news_items ORDER BY workflow_id'
      )
      return result.rows.map(row => row.workflow_id)
    } catch (error) {
      logger.error('db.getUniqueWorkflowIds.error', { error })
      throw error
    }
  },

  getUniqueSources: async () => {
    const pool = getPool()

    try {
      const result = await pool.query(
        'SELECT DISTINCT source FROM news_items ORDER BY source'
      )
      return result.rows.map(row => row.source)
    } catch (error) {
      logger.error('db.getUniqueSources.error', { error })
      throw error
    }
  },

  getUniqueMunicipalities: async () => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT DISTINCT location->>'municipality' as municipality
        FROM news_items
        WHERE location->>'municipality' IS NOT NULL
        ORDER BY municipality`
      )
      return result.rows.map(row => row.municipality)
    } catch (error) {
      logger.error('db.getUniqueMunicipalities.error', { error })
      throw error
    }
  },

  // Utility functions
  clearAllData: async () => {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM column_data')
      await client.query('DELETE FROM news_items')
      await client.query('DELETE FROM dashboards')
      await client.query('COMMIT')
      logger.info('db.clearAllData.success')
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('db.clearAllData.error', { error })
      throw error
    } finally {
      client.release()
    }
  },

  // Cleanup old news items
  cleanupOldItems: async (olderThanDays = 7) => {
    const pool = getPool()
    const client = await pool.connect()

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      await client.query('BEGIN')

      // Delete old news items
      const result = await client.query(
        `DELETE FROM news_items
        WHERE created_in_db < $1`,
        [cutoffDate.toISOString()]
      )

      // Delete old column data
      await client.query(
        `DELETE FROM column_data
        WHERE created_at < $1`,
        [cutoffDate.toISOString()]
      )

      await client.query('COMMIT')

      return {
        success: true,
        removedCount: result.rowCount || 0,
        cutoffDate: cutoffDate.toISOString()
      }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('db.cleanupOldItems.error', { error })
      throw error
    } finally {
      client.release()
    }
  },

  // Migration: Add createdInDb to existing items
  migrateCreatedInDb: async () => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `UPDATE news_items
        SET created_in_db = timestamp
        WHERE created_in_db IS NULL`
      )

      return { success: true, updated: result.rowCount || 0 }
    } catch (error) {
      logger.error('db.migrateCreatedInDb.error', { error })
      throw error
    }
  },

  // Sync column data from general news storage
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
        for (const column of dashboard.columns.filter((col: DashboardColumn) => !col.isArchived)) {
          const result = await persistentDb.syncColumnDataFromGeneral(column.id)
          totalSynced += result.itemsFound
        }
      }
    }

    logger.info('db.syncColumnDataAll.completed', { totalSynced })

    return { success: true, totalItemsSynced: totalSynced }
  },

  // User preferences
  getUserPreferences: async (userId: string) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          user_id as "userId",
          default_dashboard_id as "defaultDashboardId",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM user_preferences
        WHERE user_id = $1`,
        [userId]
      )

      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      logger.error('db.getUserPreferences.error', { error, userId })
      throw error
    }
  },

  setUserPreferences: async (userId: string, preferences: { defaultDashboardId?: string }) => {
    const pool = getPool()

    try {
      await pool.query(
        `INSERT INTO user_preferences (user_id, default_dashboard_id, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          default_dashboard_id = EXCLUDED.default_dashboard_id,
          updated_at = NOW()`,
        [userId, preferences.defaultDashboardId || null]
      )

      return await persistentDb.getUserPreferences(userId)
    } catch (error) {
      logger.error('db.setUserPreferences.error', { error, userId })
      throw error
    }
  },

  // Dashboard follows
  getUserDashboardFollows: async (userId: string) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          user_id as "userId",
          dashboard_id as "dashboardId",
          followed_at as "followedAt"
        FROM user_dashboard_follows
        WHERE user_id = $1
        ORDER BY followed_at DESC`,
        [userId]
      )

      return result.rows
    } catch (error) {
      logger.error('db.getUserDashboardFollows.error', { error, userId })
      throw error
    }
  },

  getDashboardFollowers: async (dashboardId: string) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          user_id as "userId",
          dashboard_id as "dashboardId",
          followed_at as "followedAt"
        FROM user_dashboard_follows
        WHERE dashboard_id = $1
        ORDER BY followed_at DESC`,
        [dashboardId]
      )

      return result.rows
    } catch (error) {
      logger.error('db.getDashboardFollowers.error', { error, dashboardId })
      throw error
    }
  },

  followDashboard: async (userId: string, dashboardId: string) => {
    const pool = getPool()

    try {
      await pool.query(
        `INSERT INTO user_dashboard_follows (user_id, dashboard_id, followed_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, dashboard_id) DO NOTHING`,
        [userId, dashboardId]
      )

      return { success: true }
    } catch (error) {
      logger.error('db.followDashboard.error', { error, userId, dashboardId })
      throw error
    }
  },

  unfollowDashboard: async (userId: string, dashboardId: string) => {
    const pool = getPool()

    try {
      await pool.query(
        `DELETE FROM user_dashboard_follows
        WHERE user_id = $1 AND dashboard_id = $2`,
        [userId, dashboardId]
      )

      return { success: true }
    } catch (error) {
      logger.error('db.unfollowDashboard.error', { error, userId, dashboardId })
      throw error
    }
  },

  // Health check
  isConnected: async () => {
    try {
      const pool = getPool()
      const result = await pool.query('SELECT 1')
      return result.rows.length > 0
    } catch (error) {
      logger.error('db.isConnected.error', { error })
      return false
    }
  }
}