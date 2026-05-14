import { NewsItem, Dashboard, DashboardColumn } from './types'
import { logger } from './logger'
import { getPool } from './db/pool'
import { MAIN_DASHBOARD_ID, DEFAULT_DASHBOARD } from './db/constants'
import { buildBatchInsert } from './db/batch'
import {
  cleanupOldItems as adminCleanupOldItems,
  logApiRequest as adminLogApiRequest,
  getApiRequestLogs as adminGetApiRequestLogs,
} from './db/admin'
import {
  setColumnData as columnDataSet,
  getColumnData as columnDataGet,
  getColumnDataBatch as columnDataGetBatch,
  setColumnDataBatch as columnDataSetBatch,
  appendColumnDataBatch as columnDataAppendBatch,
  syncColumnDataFromGeneral as columnDataSyncFromGeneral,
} from './db/column-data'
import {
  addNewsItem as newsItemsAdd,
  addNewsItems as newsItemsAddMany,
  getNewsItems as newsItemsGetAll,
  getRecentNewsItems as newsItemsGetRecent,
  deleteNewsItem as newsItemsDelete,
  getNewsItemsPaginated as newsItemsGetPaginated,
  getNewsItemsByWorkflow as newsItemsByWorkflow,
  getNewsItemsByWorkflows as newsItemsByWorkflows,
  getUniqueWorkflowIds as newsItemsUniqueWorkflowIds,
  getUniqueSources as newsItemsUniqueSources,
  getUniqueMunicipalities as newsItemsUniqueMunicipalities,
  migrateCreatedInDb as newsItemsMigrateCreatedInDb,
} from './db/news-items'

// Re-export pool-helpern så kallsidor som importerar getPool fran
// '@/lib/db-postgresql' fortsatter funka.
export { getPool }

export const persistentDb = {
  // News items (P2-1 steg 4 — implementation i lib/db/news-items.ts)
  addNewsItem: newsItemsAdd,
  addNewsItems: newsItemsAddMany,
  getNewsItems: newsItemsGetAll,
  getRecentNewsItems: newsItemsGetRecent,
  deleteNewsItem: newsItemsDelete,
  getNewsItemsPaginated: newsItemsGetPaginated,

  // Dashboards
  addDashboard: async (dashboard: Dashboard) => {
    const pool = getPool()

    try {
      await pool.query(
        `INSERT INTO dashboards (
          id, name, slug, columns, view_count, last_viewed, created_at, created_by, created_by_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING`,
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

    if (id === MAIN_DASHBOARD_ID || id === 'main-dashboard') {
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
    return await persistentDb.getDashboard(MAIN_DASHBOARD_ID)
  },

  getDashboardBySlug: async (slug: string) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          id, name, slug, description, columns, view_count as "viewCount",
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
      id: crypto.randomUUID(),
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
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Lock the row for the duration of the transaction. Two simultaneous
      // updates (eg. double-clicking a save button) are serialised so neither
      // reads stale data and overwrites the other.
      const existingRes = await client.query(
        `SELECT
          id, name, slug, columns, view_count as "viewCount",
          last_viewed as "lastViewed", created_at as "createdAt"
        FROM dashboards
        WHERE id = $1
        FOR UPDATE`,
        [id]
      )

      const existing = existingRes.rows[0]
        ? {
            ...existingRes.rows[0],
            columns: typeof existingRes.rows[0].columns === 'string'
              ? JSON.parse(existingRes.rows[0].columns)
              : (existingRes.rows[0].columns || [])
          }
        : null

      if (!existing && (id === MAIN_DASHBOARD_ID || id === 'main-dashboard')) {
        await client.query('COMMIT')
        const newDashboard = { ...DEFAULT_DASHBOARD, ...updates }
        await persistentDb.addDashboard(newDashboard)
        return newDashboard
      }

      if (!existing) {
        await client.query('COMMIT')
        return null
      }

      const updated = { ...existing, ...updates }

      await client.query(
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

      await client.query('COMMIT')
      return updated
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      logger.error('db.updateDashboard.error', { error, id })
      throw error
    } finally {
      client.release()
    }
  },

  /**
   * Atomically bump view_count and last_viewed in a single UPDATE.
   * Used on every dashboard GET — avoids the SELECT+UPDATE round-trip of
   * the generic updateDashboard.
   */
  incrementDashboardView: async (id: string): Promise<void> => {
    const pool = getPool()
    try {
      await pool.query(
        `UPDATE dashboards
         SET view_count = COALESCE(view_count, 0) + 1,
             last_viewed = NOW()
         WHERE id = $1`,
        [id]
      )
    } catch (error) {
      logger.error('db.incrementDashboardView.error', { error, id })
    }
  },

  /**
   * Delete a dashboard by id. Refuses to delete the main/default dashboard.
   * Also removes any associated dashboard_follows rows (column_data lives keyed
   * by columnId so the rows are orphaned — they don't show anywhere once the
   * dashboard is gone).
   */
  deleteDashboard: async (id: string): Promise<boolean> => {
    if (id === MAIN_DASHBOARD_ID || id === 'main-dashboard') {
      throw new Error('Main dashboard cannot be deleted')
    }

    const pool = getPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Cascade-clean follows table if it exists; ignore "relation does not exist".
      await client.query(
        'DELETE FROM dashboard_follows WHERE dashboard_id = $1',
        [id]
      ).catch(() => {})

      const res = await client.query('DELETE FROM dashboards WHERE id = $1', [id])
      await client.query('COMMIT')
      return (res.rowCount ?? 0) > 0
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('db.deleteDashboard.error', { error, id })
      throw error
    } finally {
      client.release()
    }
  },

  // Column data (P2-1 steg 5 — implementation i lib/db/column-data.ts)
  setColumnData: columnDataSet,
  getColumnData: columnDataGet,
  getColumnDataBatch: columnDataGetBatch,
  setColumnDataBatch: columnDataSetBatch,
  appendColumnDataBatch: columnDataAppendBatch,

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

  // News items by workflow + admin-distincts (P2-1 steg 4)
  getNewsItemsByWorkflow: newsItemsByWorkflow,
  getNewsItemsByWorkflows: newsItemsByWorkflows,
  getUniqueWorkflowIds: newsItemsUniqueWorkflowIds,
  getUniqueSources: newsItemsUniqueSources,
  getUniqueMunicipalities: newsItemsUniqueMunicipalities,

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

  // Cleanup old news items. Default retention: 30 dagar (P2-17).
  cleanupOldItems: adminCleanupOldItems,

  // Migration: Add createdInDb to existing items (P2-1 steg 4)
  migrateCreatedInDb: newsItemsMigrateCreatedInDb,

  // Sync column data from news_items (P2-1 steg 5 — implementation i lib/db/column-data.ts)
  syncColumnDataFromGeneral: columnDataSyncFromGeneral,

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

  // API request logging — saniterad metadata, aldrig payload. Persisterar
  // inte längre till databasen; loggning via Cloud Logging. Detaljer:
  // lib/db/admin.ts.
  logApiRequest: adminLogApiRequest,
  getApiRequestLogs: adminGetApiRequestLogs,

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
  },

}
