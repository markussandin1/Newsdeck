/**
 * Admin/operations-funktioner (P2-1 steg 3):
 *  - cleanupOldItems: ta bort news_items + column_data äldre än N dagar
 *  - logApiRequest: strukturerad audit-loggning (skickar via logger,
 *    persisterar inte längre)
 *  - getApiRequestLogs: läs historiska rader från api_request_logs
 *    (admin-vyn använder dem för diagnostik)
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

export async function getApiRequestLogs(
  limit = 100,
  filters?: { success?: boolean; endpoint?: string },
) {
  const pool = getPool()

  try {
    let query = `
      SELECT
        id, endpoint, method, status_code as "statusCode", success,
        request_body as "requestBody", response_body as "responseBody",
        error_message as "errorMessage", ip_address as "ipAddress",
        user_agent as "userAgent", created_at as "createdAt"
      FROM api_request_logs
    `
    const params: (boolean | string | number)[] = []
    const conditions: string[] = []

    if (filters?.success !== undefined) {
      conditions.push(`success = $${params.length + 1}`)
      params.push(filters.success)
    }

    if (filters?.endpoint) {
      conditions.push(`endpoint = $${params.length + 1}`)
      params.push(filters.endpoint)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

    const result = await pool.query(query, params)

    return result.rows.map((row) => ({
      ...row,
      requestBody: typeof row.requestBody === 'string' ? JSON.parse(row.requestBody) : row.requestBody,
      responseBody: typeof row.responseBody === 'string' ? JSON.parse(row.responseBody) : row.responseBody,
    }))
  } catch (error) {
    logger.error('db.getApiRequestLogs.error', { error })
    throw error
  }
}
