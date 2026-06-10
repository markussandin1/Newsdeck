/**
 * Web Push-prenumerationer. endpoint är globalt unik (browserns push-URL);
 * upsert på endpoint gör subscribe idempotent.
 */
import { logger } from '../logger'
import { getPool } from './pool'

export interface PushSubscriptionRow {
  id: string
  userId: string
  endpoint: string
  keys: { p256dh: string; auth: string }
  columnIds: string[]
  newsValueThreshold: number
}

const SELECT = `
  id, user_id as "userId", endpoint, keys,
  column_ids as "columnIds", news_value_threshold as "newsValueThreshold"
`

export async function upsertPushSubscription(sub: {
  userId: string
  endpoint: string
  keys: { p256dh: string; auth: string }
  columnIds: string[]
  newsValueThreshold: number
}): Promise<void> {
  const pool = getPool()
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys, column_ids, news_value_threshold, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        keys = EXCLUDED.keys,
        column_ids = EXCLUDED.column_ids,
        news_value_threshold = EXCLUDED.news_value_threshold,
        updated_at = NOW()`,
      [sub.userId, sub.endpoint, JSON.stringify(sub.keys), sub.columnIds, sub.newsValueThreshold],
    )
  } catch (error) {
    logger.error('db.upsertPushSubscription.error', { error, userId: sub.userId })
    throw error
  }
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const pool = getPool()
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint])
  } catch (error) {
    logger.error('db.deletePushSubscription.error', { error })
    throw error
  }
}

export async function getPushSubscriptionsForColumns(
  columnIds: string[],
): Promise<PushSubscriptionRow[]> {
  if (columnIds.length === 0) return []
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT ${SELECT} FROM push_subscriptions WHERE column_ids && $1`,
      [columnIds],
    )
    return result.rows
  } catch (error) {
    logger.error('db.getPushSubscriptionsForColumns.error', { error })
    throw error
  }
}
