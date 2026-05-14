/**
 * dashboards-tabellens datalager (P2-1 steg 6).
 *
 * Innehåller CRUD och kolumnhantering (add/remove/restore/archive)
 * eftersom kolumner lever som JSONB inuti dashboards-raden — det går
 * inte att separera utan att bryta API:t.
 */
import { Dashboard, DashboardColumn } from '../types'
import { logger } from '../logger'
import { getPool } from './pool'
import { MAIN_DASHBOARD_ID, DEFAULT_DASHBOARD } from './constants'

function parseRow(row: Record<string, unknown>): Dashboard {
  return {
    ...row,
    filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
    columns: typeof row.columns === 'string' ? JSON.parse(row.columns as string) : (row.columns || []),
  } as unknown as Dashboard
}

export async function addDashboard(dashboard: Dashboard) {
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
        dashboard.createdByName,
      ],
    )
    return dashboard
  } catch (error) {
    logger.error('db.addDashboard.error', { error, dashboardId: dashboard.id })
    throw error
  }
}

export async function getDashboards() {
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT
        id, name, slug, columns, view_count as "viewCount",
        last_viewed as "lastViewed", created_at as "createdAt",
        created_by as "createdBy", created_by_name as "createdByName"
      FROM dashboards
      ORDER BY created_at DESC`,
    )
    return result.rows.map(row => ({
      ...row,
      columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
    })) as Dashboard[]
  } catch (error) {
    logger.error('db.getDashboards.error', { error })
    throw error
  }
}

/**
 * Normalisera legacy-strängen 'main-dashboard' till UUID:n som radens id ar i db
 * sedan migration 006. Routes pa /api/dashboards/main passar fortfarande denna
 * straing — utan normalisering missar SELECT raden och fallback-grenen tror den
 * ska skapa en ny (vilket ar no-op via ON CONFLICT DO NOTHING).
 */
function normalizeId(id: string): string {
  return id === 'main-dashboard' ? MAIN_DASHBOARD_ID : id
}

export async function getDashboard(rawId: string): Promise<Dashboard | null> {
  const pool = getPool()
  const id = normalizeId(rawId)

  if (id === MAIN_DASHBOARD_ID) {
    try {
      const result = await pool.query(
        `SELECT
          id, name, slug, columns, view_count as "viewCount",
          last_viewed as "lastViewed", created_at as "createdAt"
        FROM dashboards
        WHERE id = $1`,
        [id],
      )

      if (result.rows.length > 0) {
        return parseRow(result.rows[0])
      }

      await addDashboard(DEFAULT_DASHBOARD)
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
      [id],
    )

    if (result.rows.length === 0) return null
    return parseRow(result.rows[0])
  } catch (error) {
    logger.error('db.getDashboard.error', { error, id })
    throw error
  }
}

export async function getMainDashboard() {
  return getDashboard(MAIN_DASHBOARD_ID)
}

export async function getDashboardBySlug(slug: string): Promise<Dashboard | null> {
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT
        id, name, slug, description, columns, view_count as "viewCount",
        last_viewed as "lastViewed", created_at as "createdAt"
      FROM dashboards
      WHERE slug = $1`,
      [slug],
    )

    if (result.rows.length === 0) return null
    return parseRow(result.rows[0])
  } catch (error) {
    logger.error('db.getDashboardBySlug.error', { error, slug })
    throw error
  }
}

export async function createDashboard(
  name: string,
  description?: string,
  createdBy?: string,
  createdByName?: string,
) {
  const { generateSlug, ensureUniqueSlug } = await import('../utils')

  const existingDashboards = await getDashboards()
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
    viewCount: 0,
  }

  await addDashboard(newDashboard)
  return newDashboard
}

/**
 * Lås raden för transaktionens längd. Två samtidiga updates (t.ex. dubbelklick
 * på spara) serialiseras så ingen läser stale data och skriver över den andra.
 */
export async function updateDashboard(rawId: string, updates: Partial<Dashboard>) {
  const pool = getPool()
  const client = await pool.connect()
  const id = normalizeId(rawId)

  try {
    await client.query('BEGIN')

    const existingRes = await client.query(
      `SELECT
        id, name, slug, columns, view_count as "viewCount",
        last_viewed as "lastViewed", created_at as "createdAt"
      FROM dashboards
      WHERE id = $1
      FOR UPDATE`,
      [id],
    )

    const existing = existingRes.rows[0]
      ? {
          ...existingRes.rows[0],
          columns: typeof existingRes.rows[0].columns === 'string'
            ? JSON.parse(existingRes.rows[0].columns)
            : (existingRes.rows[0].columns || []),
        }
      : null

    if (!existing && id === MAIN_DASHBOARD_ID) {
      await client.query('COMMIT')
      const newDashboard = { ...DEFAULT_DASHBOARD, ...updates }
      await addDashboard(newDashboard)
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
        id,
      ],
    )

    await client.query('COMMIT')
    return updated as Dashboard
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    logger.error('db.updateDashboard.error', { error, id })
    throw error
  } finally {
    client.release()
  }
}

/** Atomic bump av view_count + last_viewed i en UPDATE. */
export async function incrementDashboardView(rawId: string): Promise<void> {
  const pool = getPool()
  const id = normalizeId(rawId)
  try {
    await pool.query(
      `UPDATE dashboards
       SET view_count = COALESCE(view_count, 0) + 1,
           last_viewed = NOW()
       WHERE id = $1`,
      [id],
    )
  } catch (error) {
    logger.error('db.incrementDashboardView.error', { error, id })
  }
}

/**
 * Tar bort en dashboard. Vägrar att radera main/default. dashboard_follows
 * rensas också; column_data är fortfarande kvar (keyas på columnId) men blir
 * orphaned eftersom dashboarden borta.
 */
export async function deleteDashboard(id: string): Promise<boolean> {
  if (id === MAIN_DASHBOARD_ID || id === 'main-dashboard') {
    throw new Error('Main dashboard cannot be deleted')
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'DELETE FROM dashboard_follows WHERE dashboard_id = $1',
      [id],
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
}

// --- Column management ---

export async function addColumnToDashboard(dashboardId: string, column: DashboardColumn) {
  const dashboard = await getDashboard(dashboardId)
  if (!dashboard) return null
  const updatedColumns = [...dashboard.columns, column]
  return updateDashboard(dashboardId, { columns: updatedColumns })
}

export async function removeColumnFromDashboard(dashboardId: string, columnId: string) {
  const dashboard = await getDashboard(dashboardId)
  if (!dashboard) return null
  const updatedColumns = dashboard.columns.map((col: DashboardColumn) =>
    col.id === columnId
      ? { ...col, isArchived: true, archivedAt: new Date().toISOString() }
      : col,
  )
  return updateDashboard(dashboardId, { columns: updatedColumns })
}

export async function restoreColumnInDashboard(dashboardId: string, columnId: string) {
  const dashboard = await getDashboard(dashboardId)
  if (!dashboard) return null
  const updatedColumns = dashboard.columns.map((col: DashboardColumn) =>
    col.id === columnId
      ? { ...col, isArchived: false, archivedAt: undefined }
      : col,
  )
  return updateDashboard(dashboardId, { columns: updatedColumns })
}

export async function getArchivedColumns(dashboardId: string) {
  const dashboard = await getDashboard(dashboardId)
  if (!dashboard) return []
  return dashboard.columns.filter((col: DashboardColumn) => col.isArchived === true)
}
