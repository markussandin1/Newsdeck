/**
 * Admin/operations-funktioner:
 *  - cleanupOldItems: ta bort news_items + column_data äldre än N dagar
 *  - logApiRequest: strukturerad audit-loggning till Cloud Logging
 *
 * Dessa hör inte hemma på datalager-nivå utan är drift-helpers; egen
 * modul gör det enklare att hitta dem.
 */
import { getPool } from './pool'
import { logger } from '../logger'

export async function cleanupOldItems(olderThanDays = 30) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    await client.query('BEGIN')

    const result = await client.query(
      `DELETE FROM news_items WHERE created_in_db < $1`,
      [cutoffDate.toISOString()],
    )

    await client.query(
      `DELETE FROM column_data WHERE created_at < $1`,
      [cutoffDate.toISOString()],
    )

    await client.query('COMMIT')

    return {
      success: true,
      removedCount: result.rowCount || 0,
      cutoffDate: cutoffDate.toISOString(),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('db.cleanupOldItems.error', { error })
    throw error
  } finally {
    client.release()
  }
}

export interface ApiRequestLogEntry {
  endpoint: string
  method: string
  statusCode: number
  success: boolean
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
}

export async function logApiRequest(log: ApiRequestLogEntry) {
  logger.info('api.request', {
    endpoint: log.endpoint,
    method: log.method,
    statusCode: log.statusCode,
    success: log.success,
    errorMessage: log.errorMessage,
  })
}
