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
  addDashboard as dashboardsAdd,
  getDashboards as dashboardsGetAll,
  getDashboard as dashboardsGet,
  getMainDashboard as dashboardsGetMain,
  getDashboardBySlug as dashboardsGetBySlug,
  createDashboard as dashboardsCreate,
  updateDashboard as dashboardsUpdate,
  incrementDashboardView as dashboardsIncrementView,
  deleteDashboard as dashboardsDelete,
  addColumnToDashboard as dashboardsAddColumn,
  removeColumnFromDashboard as dashboardsRemoveColumn,
  restoreColumnInDashboard as dashboardsRestoreColumn,
  getArchivedColumns as dashboardsGetArchivedColumns,
} from './db/dashboards'
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
  getNewsItemsByWorkflow: newsItemsByWorkflow,
  getNewsItemsByWorkflows: newsItemsByWorkflows,
  getNewsItemsPaginated: newsItemsGetPaginated,

  // Dashboards (P2-1 steg 6 — implementation i lib/db/dashboards.ts)
  addDashboard: dashboardsAdd,
  getDashboards: dashboardsGetAll,
  getDashboard: dashboardsGet,
  getMainDashboard: dashboardsGetMain,
  getDashboardBySlug: dashboardsGetBySlug,
  createDashboard: dashboardsCreate,
  updateDashboard: dashboardsUpdate,
  incrementDashboardView: dashboardsIncrementView,
  deleteDashboard: dashboardsDelete,
  addColumnToDashboard: dashboardsAddColumn,
  removeColumnFromDashboard: dashboardsRemoveColumn,
  restoreColumnInDashboard: dashboardsRestoreColumn,
  getArchivedColumns: dashboardsGetArchivedColumns,

  // Column data (P2-1 steg 5 — implementation i lib/db/column-data.ts)
  setColumnData: columnDataSet,
  getColumnData: columnDataGet,
  getColumnDataBatch: columnDataGetBatch,
  setColumnDataBatch: columnDataSetBatch,
  appendColumnDataBatch: columnDataAppendBatch,

  // Admin distincts (P2-1 steg 4)
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
