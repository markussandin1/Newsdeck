import { DashboardColumn } from './types'
import { logger } from './logger'
import { getPool } from './db/pool'
import {
  cleanupOldItems as adminCleanupOldItems,
  logApiRequest as adminLogApiRequest,
} from './db/admin'
import {
  getUserPreferences as userGetPrefs,
  setUserPreferences as userSetPrefs,
  getUserDashboardFollows as userGetFollows,
  getDashboardFollowers as userGetFollowers,
  followDashboard as userFollow,
  unfollowDashboard as userUnfollow,
} from './db/user'
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

  // User preferences + dashboard follows (P2-1 steg 7 — implementation i lib/db/user.ts)
  getUserPreferences: userGetPrefs,
  setUserPreferences: userSetPrefs,
  getUserDashboardFollows: userGetFollows,
  getDashboardFollowers: userGetFollowers,
  followDashboard: userFollow,
  unfollowDashboard: userUnfollow,

  // API request logging — sanerad metadata, aldrig payload. Skickas till
  // Cloud Logging (persisteras inte). Detaljer: lib/db/admin.ts.
  logApiRequest: adminLogApiRequest,

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
