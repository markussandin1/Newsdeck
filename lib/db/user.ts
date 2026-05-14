/**
 * User preferences + dashboard follows (P2-1 steg 7).
 *
 * Tva relaterade tabeller: user_preferences (default dashboard) och
 * user_dashboard_follows (vilka dashboards en anvandare foljer).
 * Holls i samma modul eftersom bada beror anvandar-baserade
 * preferensinstallningar.
 */
import { logger } from '../logger'
import { getPool } from './pool'

export async function getUserPreferences(userId: string) {
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
      [userId],
    )
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    logger.error('db.getUserPreferences.error', { error, userId })
    throw error
  }
}

export async function setUserPreferences(
  userId: string,
  preferences: { defaultDashboardId?: string },
) {
  const pool = getPool()
  try {
    await pool.query(
      `INSERT INTO user_preferences (user_id, default_dashboard_id, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        default_dashboard_id = EXCLUDED.default_dashboard_id,
        updated_at = NOW()`,
      [userId, preferences.defaultDashboardId || null],
    )
    return getUserPreferences(userId)
  } catch (error) {
    logger.error('db.setUserPreferences.error', { error, userId })
    throw error
  }
}

export async function getUserDashboardFollows(userId: string) {
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
      [userId],
    )
    return result.rows
  } catch (error) {
    logger.error('db.getUserDashboardFollows.error', { error, userId })
    throw error
  }
}

export async function getDashboardFollowers(dashboardId: string) {
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
      [dashboardId],
    )
    return result.rows
  } catch (error) {
    logger.error('db.getDashboardFollowers.error', { error, dashboardId })
    throw error
  }
}

export async function followDashboard(userId: string, dashboardId: string) {
  const pool = getPool()
  try {
    await pool.query(
      `INSERT INTO user_dashboard_follows (user_id, dashboard_id, followed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, dashboard_id) DO NOTHING`,
      [userId, dashboardId],
    )
    return { success: true }
  } catch (error) {
    logger.error('db.followDashboard.error', { error, userId, dashboardId })
    throw error
  }
}

export async function unfollowDashboard(userId: string, dashboardId: string) {
  const pool = getPool()
  try {
    await pool.query(
      `DELETE FROM user_dashboard_follows
      WHERE user_id = $1 AND dashboard_id = $2`,
      [userId, dashboardId],
    )
    return { success: true }
  } catch (error) {
    logger.error('db.unfollowDashboard.error', { error, userId, dashboardId })
    throw error
  }
}
