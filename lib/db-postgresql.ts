import { Pool } from 'pg'
import { parse as parseConnectionString } from 'pg-connection-string'
import { NewsItem, Dashboard, DashboardColumn, Country, Region, Municipality } from './types'
import { logger } from './logger'

// PostgreSQL connection pool
let pool: Pool | null = null

export const getPool = () => {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL

    if (!DATABASE_URL) {
      throw new Error(
        'DATABASE_URL environment variable is not set!\n' +
        '\n' +
        'For local development:\n' +
        '  1. Start Cloud SQL Proxy: npm run proxy:start\n' +
        '  2. Ensure .env.local has DATABASE_URL set\n' +
        '  3. Or use: npm run dev:full (auto-starts proxy)\n' +
        '\n' +
        'For production:\n' +
        '  Set DATABASE_URL in your environment variables\n'
      )
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
      // Detect connection errors (proxy not running or stale connection)
      if (err.message.includes('ECONNREFUSED') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('Connection refused')) {
        logger.error('db.pool.connectionError', {
          error: 'Cloud SQL Proxy connection issue',
          solution: 'Run: npm run proxy:restart',
          details: err.message
        })
      } else {
        logger.error('db.pool.unexpectedError', { error: err.message })
      }
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
  isDefault: true,
  createdBy: 'system',
  createdByName: 'System'
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
      const result = await pool.query(
        `INSERT INTO news_items (
          source_id, workflow_id, source, timestamp, title, description,
          news_value, category, severity, location, extra, raw, created_in_db,
          country_code, region_country_code, region_code,
          municipality_country_code, municipality_region_code, municipality_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING db_id`,
        [
          item.id || null,  // Original source ID (can be null)
          item.workflowId,
          item.source,
          item.timestamp,
          item.title,
          item.description || null,
          item.newsValue,
          item.category || null,
          item.severity || null,
          JSON.stringify(item.location || {}),
          JSON.stringify({ ...(item.extra || {}), trafficCamera: item.trafficCamera }),
          JSON.stringify(item.raw || {}),
          itemWithTimestamp.createdInDb,
          item.countryCode || null,
          item.regionCountryCode || null,
          item.regionCode || null,
          item.municipalityCountryCode || null,
          item.municipalityRegionCode || null,
          item.municipalityCode || null
        ]
      )

      // Return item with generated db_id
      return {
        ...itemWithTimestamp,
        dbId: result.rows[0].db_id
      }
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

      const insertedItems = []

      for (const item of itemsWithTimestamp) {
        const result = await client.query(
          `INSERT INTO news_items (
            source_id, workflow_id, source, timestamp, title, description,
            news_value, category, severity, location, extra, raw, created_in_db,
            country_code, region_country_code, region_code,
            municipality_country_code, municipality_region_code, municipality_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING db_id`,
          [
            item.id || null,  // Original source ID (can be null)
            item.workflowId,
            item.source,
            item.timestamp,
            item.title,
            item.description || null,
            item.newsValue,
            item.category || null,
            item.severity || null,
            JSON.stringify(item.location || {}),
            JSON.stringify({ ...(item.extra || {}), trafficCamera: item.trafficCamera }),
            JSON.stringify(item.raw || {}),
            item.createdInDb,
            item.countryCode || null,
            item.regionCountryCode || null,
            item.regionCode || null,
            item.municipalityCountryCode || null,
            item.municipalityRegionCode || null,
            item.municipalityCode || null
          ]
        )

        insertedItems.push({
          ...item,
          dbId: result.rows[0].db_id
        })
      }

      await client.query('COMMIT')
      return insertedItems
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
          db_id as "dbId",
          source_id as "id",
          workflow_id as "workflowId",
          source, timestamp, title, description,
          news_value as "newsValue",
          category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          country_code as "countryCode",
          region_country_code as "regionCountryCode",
          region_code as "regionCode",
          municipality_country_code as "municipalityCountryCode",
          municipality_region_code as "municipalityRegionCode",
          municipality_code as "municipalityCode"
        FROM news_items
        ORDER BY created_in_db DESC, timestamp DESC`
      )

      return result.rows.map(row => {
        const extra = typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra
        const trafficCamera = extra?.trafficCamera
        
        // Remove trafficCamera from extra to avoid duplication/clutter if desired, 
        // or just leave it. For now, we extract it to top level.
        return {
          ...row,
          location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
          extra,
          trafficCamera,
          raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
        }
      })
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
          db_id as "dbId",
          source_id as "id",
          workflow_id as "workflowId",
          source, timestamp, title, description,
          news_value as "newsValue",
          category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          country_code as "countryCode",
          region_country_code as "regionCountryCode",
          region_code as "regionCode",
          municipality_country_code as "municipalityCountryCode",
          municipality_region_code as "municipalityRegionCode",
          municipality_code as "municipalityCode"
        FROM news_items
        ORDER BY created_in_db DESC, timestamp DESC
        LIMIT $1`,
        [limit]
      )

      return result.rows.map(row => {
        const extra = typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra
        const trafficCamera = extra?.trafficCamera
        
        // Remove trafficCamera from extra to avoid duplication/clutter if desired, 
        // or just leave it. For now, we extract it to top level.
        return {
          ...row,
          location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
          extra,
          trafficCamera,
          raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
        }
      })
    } catch (error) {
      logger.error('db.getRecentNewsItems.error', { error })
      throw error
    }
  },

  getTrafficCameraItems: async (limit = 50, offset = 0) => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT
          db_id AS "dbId",
          source_id AS "id",
          workflow_id AS "workflowId",
          source,
          timestamp,
          title,
          description,
          news_value AS "newsValue",
          category,
          severity,
          location,
          country_code AS "countryCode",
          region_country_code AS "regionCountryCode",
          region_code AS "regionCode",
          municipality_country_code AS "municipalityCountryCode",
          municipality_region_code AS "municipalityRegionCode",
          municipality_code AS "municipalityCode",
          created_in_db AS "createdInDb",
          extra,
          raw
        FROM news_items
        WHERE
          extra->'trafficCamera'->>'currentUrl' IS NOT NULL
          AND extra->'trafficCamera'->>'status' = 'ready'
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      return result.rows.map(row => {
        const extra = typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra
        const trafficCamera = extra?.trafficCamera || null

        return {
          dbId: row.dbId,
          id: row.id,
          workflowId: row.workflowId,
          source: row.source,
          timestamp: row.timestamp,
          title: row.title,
          description: row.description,
          newsValue: row.newsValue,
          category: row.category,
          severity: row.severity,
          location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
          countryCode: row.countryCode,
          regionCountryCode: row.regionCountryCode,
          regionCode: row.regionCode,
          municipalityCountryCode: row.municipalityCountryCode,
          municipalityRegionCode: row.municipalityRegionCode,
          municipalityCode: row.municipalityCode,
          createdInDb: row.createdInDb,
          extra,
          trafficCamera,
          raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
        }
      })
    } catch (error) {
      logger.error('db.getTrafficCameraItems.error', { error, limit, offset })
      throw error
    }
  },

  getTrafficCameraCount: async () => {
    const pool = getPool()

    try {
      const result = await pool.query(
        `SELECT COUNT(*) AS count
         FROM news_items
         WHERE
           extra->'trafficCamera'->>'currentUrl' IS NOT NULL
           AND extra->'trafficCamera'->>'status' = 'ready'`
      )
      return parseInt(result.rows[0].count, 10)
    } catch (error) {
      logger.error('db.getTrafficCameraCount.error', { error })
      throw error
    }
  },

  deleteNewsItem: async (dbId: string) => {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Delete from news_items table (CASCADE will handle column_data)
      const deleteResult = await client.query(
        'DELETE FROM news_items WHERE db_id = $1',
        [dbId]
      )

      if (deleteResult.rowCount === 0) {
        logger.warn('db.deleteNewsItem.notFound', { dbId })
        await client.query('ROLLBACK')
        return false
      }

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
          db_id as "dbId",
          source_id as "id",
          workflow_id as "workflowId",
          source, timestamp, title, description,
          news_value as "newsValue",
          category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          country_code as "countryCode",
          region_country_code as "regionCountryCode",
          region_code as "regionCode",
          municipality_country_code as "municipalityCountryCode",
          municipality_region_code as "municipalityRegionCode",
          municipality_code as "municipalityCode"
        FROM news_items
        ORDER BY created_in_db DESC, timestamp DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      return result.rows.map(row => {
        const extra = typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra
        const trafficCamera = extra?.trafficCamera
        
        // Remove trafficCamera from extra to avoid duplication/clutter if desired, 
        // or just leave it. For now, we extract it to top level.
        return {
          ...row,
          location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
          extra,
          trafficCamera,
          raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
        }
      })
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

      // Clear existing column data
      await client.query(
        'DELETE FROM column_data WHERE column_id = $1',
        [columnId]
      )

      // Insert new items with foreign key to news_items
      for (const item of items) {
        if (!item.dbId) {
          logger.warn('db.setColumnData.missingDbId', { itemId: item.id })
          continue
        }

        await client.query(
          `INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (column_id, news_item_db_id) DO UPDATE SET
            data = EXCLUDED.data,
            created_at = EXCLUDED.created_at`,
          [columnId, item.dbId, JSON.stringify(item), new Date().toISOString()]
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
        ? `SELECT cd.data, cd.news_item_db_id, ni.country_code, ni.region_code, ni.municipality_code
           FROM column_data cd
           LEFT JOIN news_items ni ON ni.db_id = cd.news_item_db_id
           WHERE cd.column_id = $1
           ORDER BY cd.created_at DESC LIMIT $2`
        : `SELECT cd.data, cd.news_item_db_id, ni.country_code, ni.region_code, ni.municipality_code
           FROM column_data cd
           LEFT JOIN news_items ni ON ni.db_id = cd.news_item_db_id
           WHERE cd.column_id = $1
           ORDER BY cd.created_at DESC`

      const params = limit ? [columnId, limit] : [columnId]
      const result = await pool.query(query, params)

      return result.rows.map(row => {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        // CRITICAL FIX: Ensure dbId and geographic codes are always set from the database
        // This prevents items from being lost during re-ingestion and ensures filters work correctly
        return {
          ...data,
          dbId: row.news_item_db_id,
          countryCode: row.country_code || data.countryCode,
          regionCode: row.region_code || data.regionCode,
          municipalityCode: row.municipality_code || data.municipalityCode
        }
      })
    } catch (error) {
      logger.error('db.getColumnData.error', { error, columnId })
      throw error
    }
  },

  // Batch column data operations (optimized for performance)
  getColumnDataBatch: async (columnIds: string[]) => {
    const pool = await getPool()

    try {
      if (columnIds.length === 0) {
        return {}
      }

      const result = await pool.query(
        `SELECT cd.column_id, cd.data, cd.news_item_db_id, ni.country_code, ni.region_code, ni.municipality_code
         FROM column_data cd
         LEFT JOIN news_items ni ON ni.db_id = cd.news_item_db_id
         WHERE cd.column_id = ANY($1)
         ORDER BY cd.column_id, cd.created_at DESC`,
        [columnIds]
      )

      // Group results by column_id
      const columnData: Record<string, NewsItem[]> = {}

      // Initialize empty arrays for all requested columns
      columnIds.forEach(id => {
        columnData[id] = []
      })

      // Populate with actual data
      result.rows.forEach(row => {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        if (!columnData[row.column_id]) {
          columnData[row.column_id] = []
        }
        // CRITICAL FIX: Ensure dbId and geographic codes are always set from the database
        // This prevents items from being lost during re-ingestion and ensures filters work correctly
        columnData[row.column_id].push({
          ...data,
          dbId: row.news_item_db_id,
          countryCode: row.country_code || data.countryCode,
          regionCode: row.region_code || data.regionCode,
          municipalityCode: row.municipality_code || data.municipalityCode
        })
      })

      return columnData
    } catch (error) {
      logger.error('db.getColumnDataBatch.error', { error, columnCount: columnIds.length })
      throw error
    }
  },

  setColumnDataBatch: async (columnData: Record<string, NewsItem[]>) => {
    const pool = await getPool()
    const client = await pool.connect()

    try {
      const columnIds = Object.keys(columnData)

      if (columnIds.length === 0) {
        return
      }

      await client.query('BEGIN')

      // Clear existing data for all columns in one query
      await client.query(
        'DELETE FROM column_data WHERE column_id = ANY($1)',
        [columnIds]
      )

      // Insert all items for all columns
      const now = new Date().toISOString()

      for (const columnId of columnIds) {
        const items = columnData[columnId]

        for (const item of items) {
          if (!item.dbId) {
            logger.warn('db.setColumnDataBatch.missingDbId', { columnId, itemId: item.id })
            continue
          }

          await client.query(
            `INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (column_id, news_item_db_id) DO UPDATE SET
              data = EXCLUDED.data,
              created_at = EXCLUDED.created_at`,
            [columnId, item.dbId, JSON.stringify(item), now]
          )
        }
      }

      await client.query('COMMIT')
      logger.info('db.setColumnDataBatch.success', { columnCount: columnIds.length })
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('db.setColumnDataBatch.error', { error })
      throw error
    } finally {
      client.release()
    }
  },

  appendColumnDataBatch: async (columnData: Record<string, NewsItem[]>) => {
    const pool = await getPool()
    const client = await pool.connect()

    try {
      const columnIds = Object.keys(columnData)

      if (columnIds.length === 0) {
        return
      }

      await client.query('BEGIN')

      const now = new Date().toISOString()
      let totalInserted = 0

      for (const columnId of columnIds) {
        const items = columnData[columnId]

        // Step 1: Remove old items with same source_id to prevent duplicates
        // Collect all source_ids from incoming items (skip nulls)
        const sourceIds = items
          .map(item => item.id)
          .filter(id => id != null && id !== '')

        if (sourceIds.length > 0) {
          // Delete existing column_data entries where news_items.source_id matches
          await client.query(
            `DELETE FROM column_data
            WHERE column_id = $1
            AND news_item_db_id IN (
              SELECT db_id FROM news_items WHERE source_id = ANY($2)
            )`,
            [columnId, sourceIds]
          )
        }

        // Step 2: Insert new items
        for (const item of items) {
          if (!item.dbId) {
            logger.warn('db.appendColumnDataBatch.missingDbId', { columnId, itemId: item.id })
            continue
          }

          await client.query(
            `INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (column_id, news_item_db_id) DO UPDATE SET
              data = EXCLUDED.data,
              created_at = EXCLUDED.created_at`,
            [columnId, item.dbId, JSON.stringify(item), now]
          )
          totalInserted++
        }
      }

      await client.query('COMMIT')
      logger.info('db.appendColumnDataBatch.success', { columnCount: columnIds.length, totalInserted })
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('db.appendColumnDataBatch.error', { error })
      throw error
    } finally {
      client.release()
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
          db_id as "dbId",
          source_id as "id",
          workflow_id as "workflowId",
          source, timestamp, title, description,
          news_value as "newsValue",
          category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          country_code as "countryCode",
          region_country_code as "regionCountryCode",
          region_code as "regionCode",
          municipality_country_code as "municipalityCountryCode",
          municipality_region_code as "municipalityRegionCode",
          municipality_code as "municipalityCode"
        FROM news_items
        WHERE workflow_id = $1
        ORDER BY created_in_db DESC, timestamp DESC`,
        [workflowId]
      )

      return result.rows.map(row => {
        const extra = typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra
        const trafficCamera = extra?.trafficCamera
        
        // Remove trafficCamera from extra to avoid duplication/clutter if desired, 
        // or just leave it. For now, we extract it to top level.
        return {
          ...row,
          location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
          extra,
          trafficCamera,
          raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
        }
      })
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
          db_id as "dbId",
          source_id as "id",
          workflow_id as "workflowId",
          source, timestamp, title, description,
          news_value as "newsValue",
          category, severity, location, extra, raw,
          created_in_db as "createdInDb",
          country_code as "countryCode",
          region_country_code as "regionCountryCode",
          region_code as "regionCode",
          municipality_country_code as "municipalityCountryCode",
          municipality_region_code as "municipalityRegionCode",
          municipality_code as "municipalityCode"
        FROM news_items
        WHERE workflow_id = ANY($1)
        ORDER BY created_in_db DESC, timestamp DESC`,
        [workflowIds]
      )

      return result.rows.map(row => {
        const extra = typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra
        const trafficCamera = extra?.trafficCamera
        
        // Remove trafficCamera from extra to avoid duplication/clutter if desired, 
        // or just leave it. For now, we extract it to top level.
        return {
          ...row,
          location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
          extra,
          trafficCamera,
          raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw
        }
      })
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
  cleanupOldItems: async (olderThanDays = 2) => {
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

  // API request logging
  logApiRequest: async (log: {
    endpoint: string
    method: string
    statusCode: number
    success: boolean
    requestBody?: unknown
    responseBody?: unknown
    errorMessage?: string
    ipAddress?: string
    userAgent?: string
  }) => {
    // Temporarily disabled for local testing - table schema mismatch
    // TODO: Re-enable after running migration to add missing columns
    logger.debug('db.logApiRequest.skipped', { endpoint: log.endpoint, method: log.method, statusCode: log.statusCode })
    return

    /*
    const pool = getPool()

    try {
      await pool.query(
        `INSERT INTO api_request_logs (
          endpoint, method, status_code, success, request_body,
          response_body, error_message, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          log.endpoint,
          log.method,
          log.statusCode,
          log.success,
          JSON.stringify(log.requestBody || {}),
          JSON.stringify(log.responseBody || {}),
          log.errorMessage || null,
          log.ipAddress || null,
          log.userAgent || null
        ]
      )
    } catch (error) {
      // Don't throw - logging should never break the API
      logger.error('db.logApiRequest.error', { error })
    }
    */
  },

  getApiRequestLogs: async (limit = 100, filters?: { success?: boolean; endpoint?: string }) => {
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

      return result.rows.map(row => ({
        ...row,
        requestBody: typeof row.requestBody === 'string' ? JSON.parse(row.requestBody) : row.requestBody,
        responseBody: typeof row.responseBody === 'string' ? JSON.parse(row.responseBody) : row.responseBody
      }))
    } catch (error) {
      logger.error('db.getApiRequestLogs.error', { error })
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
  },

  // ========================================
  // Geographic Metadata Functions
  // ========================================

  /**
   * Get all countries
   */
  getCountries: async (): Promise<Country[]> => {
    try {
      const pool = getPool()
      const result = await pool.query(`
        SELECT code, name, name_local as "nameLocal", created_at as "createdAt"
        FROM countries
        ORDER BY name
      `)
      return result.rows
    } catch (error) {
      logger.error('db.getCountries.error', { error })
      throw error
    }
  },

  /**
   * Get all regions (counties) for a specific country
   */
  getRegionsByCountry: async (countryCode: string): Promise<Region[]> => {
    try {
      const pool = getPool()
      const result = await pool.query(`
        SELECT
          country_code as "countryCode",
          code,
          name,
          name_short as "nameShort",
          is_active as "isActive",
          created_at as "createdAt"
        FROM regions
        WHERE country_code = $1 AND is_active = TRUE
        ORDER BY name
      `, [countryCode])
      return result.rows
    } catch (error) {
      logger.error('db.getRegionsByCountry.error', { error, countryCode })
      throw error
    }
  },

  /**
   * Get all municipalities for a specific region
   */
  getMunicipalitiesByRegion: async (countryCode: string, regionCode: string): Promise<Municipality[]> => {
    try {
      const pool = getPool()
      const result = await pool.query(`
        SELECT
          country_code as "countryCode",
          region_code as "regionCode",
          code,
          name,
          is_active as "isActive",
          merged_into_code as "mergedIntoCode",
          created_at as "createdAt"
        FROM municipalities
        WHERE country_code = $1 AND region_code = $2 AND is_active = TRUE
        ORDER BY name
      `, [countryCode, regionCode])
      return result.rows
    } catch (error) {
      logger.error('db.getMunicipalitiesByRegion.error', { error, countryCode, regionCode })
      throw error
    }
  },

  /**
   * Get all municipalities for a country (across all regions)
   */
  getMunicipalitiesByCountry: async (countryCode: string): Promise<Municipality[]> => {
    try {
      const pool = getPool()
      const result = await pool.query(`
        SELECT
          country_code as "countryCode",
          region_code as "regionCode",
          code,
          name,
          is_active as "isActive",
          merged_into_code as "mergedIntoCode",
          created_at as "createdAt"
        FROM municipalities
        WHERE country_code = $1 AND is_active = TRUE
        ORDER BY name
      `, [countryCode])
      return result.rows
    } catch (error) {
      logger.error('db.getMunicipalitiesByCountry.error', { error, countryCode })
      throw error
    }
  },

  /**
   * Log an unmatched location for data quality monitoring
   */
  logUnmatchedLocation: async (log: {
    rawLocation: NewsItem['location']
    failedField: string
    failedValue: string
    sourceWorkflowId: string
  }): Promise<void> => {
    try {
      const pool = getPool()
      await pool.query(`
        INSERT INTO location_normalization_logs (raw_location, failed_field, failed_value, source_workflow_id)
        VALUES ($1, $2, $3, $4)
      `, [JSON.stringify(log.rawLocation), log.failedField, log.failedValue, log.sourceWorkflowId])
    } catch (error) {
      logger.error('db.logUnmatchedLocation.error', { error, log })
      // Don't throw - logging failures shouldn't break ingestion
    }
  },

  /**
   * Get unmatched locations grouped by value for admin review
   */
  getUnmatchedLocations: async (limit: number = 100): Promise<Array<{
    value: string
    field: string
    count: number
    firstSeen: string
    lastSeen: string
  }>> => {
    try {
      const pool = getPool()
      const result = await pool.query(`
        SELECT
          failed_value as value,
          failed_field as field,
          COUNT(*) as count,
          MIN(created_at) as "firstSeen",
          MAX(created_at) as "lastSeen"
        FROM location_normalization_logs
        GROUP BY failed_value, failed_field
        ORDER BY count DESC, "lastSeen" DESC
        LIMIT $1
      `, [limit])
      return result.rows
    } catch (error) {
      logger.error('db.getUnmatchedLocations.error', { error })
      throw error
    }
  },

  /**
   * Create a new location name mapping (admin function)
   */
  createLocationMapping: async (mapping: {
    variant: string
    countryCode?: string
    regionCountryCode?: string
    regionCode?: string
    municipalityCountryCode?: string
    municipalityRegionCode?: string
    municipalityCode?: string
    matchPriority: number
    matchType: 'exact' | 'fuzzy'
  }): Promise<void> => {
    try {
      const pool = getPool()
      await pool.query(`
        INSERT INTO location_name_mappings (
          variant, country_code, region_country_code, region_code,
          municipality_country_code, municipality_region_code, municipality_code,
          match_priority, match_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (variant) DO UPDATE SET
          country_code = EXCLUDED.country_code,
          region_country_code = EXCLUDED.region_country_code,
          region_code = EXCLUDED.region_code,
          municipality_country_code = EXCLUDED.municipality_country_code,
          municipality_region_code = EXCLUDED.municipality_region_code,
          municipality_code = EXCLUDED.municipality_code,
          match_priority = EXCLUDED.match_priority,
          match_type = EXCLUDED.match_type
      `, [
        mapping.variant.toLowerCase().trim(),
        mapping.countryCode || null,
        mapping.regionCountryCode || null,
        mapping.regionCode || null,
        mapping.municipalityCountryCode || null,
        mapping.municipalityRegionCode || null,
        mapping.municipalityCode || null,
        mapping.matchPriority,
        mapping.matchType
      ])
    } catch (error) {
      logger.error('db.createLocationMapping.error', { error, mapping })
      throw error
    }
  }
}

/**
 * Geographic lookup functions for location normalization
 * Replaces in-memory cache with direct DB queries
 */
export const geoLookup = {
  /**
   * Find geographic codes by location name
   * @param name - Location name to search for (case-insensitive)
   * @returns Normalized location codes or null if not found
   */
  findByName: async (name: string): Promise<{
    countryCode?: string
    regionCountryCode?: string
    regionCode?: string
    municipalityCountryCode?: string
    municipalityRegionCode?: string
    municipalityCode?: string
    matchPriority?: number
    matchType?: string
  } | null> => {
    try {
      const pool = getPool()
      const result = await pool.query(
        `SELECT
          country_code,
          region_country_code,
          region_code,
          municipality_country_code,
          municipality_region_code,
          municipality_code,
          match_priority,
          match_type
        FROM location_name_mappings
        WHERE variant = $1
        ORDER BY match_priority ASC
        LIMIT 1`,
        [name.toLowerCase().trim()]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        countryCode: row.country_code,
        regionCountryCode: row.region_country_code,
        regionCode: row.region_code,
        municipalityCountryCode: row.municipality_country_code,
        municipalityRegionCode: row.municipality_region_code,
        municipalityCode: row.municipality_code,
        matchPriority: row.match_priority,
        matchType: row.match_type
      }
    } catch (error) {
      logger.error('geoLookup.findByName.error', { error, name })
      return null
    }
  },

  /**
   * Find municipality by name
   * @param name - Municipality name to search for
   * @returns Municipality codes or null
   */
  findMunicipalityByName: async (name: string) => {
    try {
      const pool = getPool()
      const result = await pool.query(
        `SELECT
          country_code,
          region_country_code,
          region_code,
          municipality_country_code,
          municipality_region_code,
          municipality_code,
          match_priority,
          match_type
        FROM location_name_mappings
        WHERE variant = $1
          AND municipality_code IS NOT NULL
        ORDER BY match_priority ASC
        LIMIT 1`,
        [name.toLowerCase().trim()]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        countryCode: row.country_code,
        regionCountryCode: row.region_country_code,
        regionCode: row.region_code,
        municipalityCountryCode: row.municipality_country_code,
        municipalityRegionCode: row.municipality_region_code,
        municipalityCode: row.municipality_code,
        matchPriority: row.match_priority,
        matchType: row.match_type
      }
    } catch (error) {
      logger.error('geoLookup.findMunicipalityByName.error', { error, name })
      return null
    }
  },

  /**
   * Find region by name
   * @param name - Region/county name to search for
   * @returns Region codes or null
   */
  findRegionByName: async (name: string) => {
    try {
      const pool = getPool()
      const result = await pool.query(
        `SELECT
          country_code,
          region_country_code,
          region_code,
          match_priority,
          match_type
        FROM location_name_mappings
        WHERE variant = $1
          AND region_code IS NOT NULL
          AND municipality_code IS NULL
        ORDER BY match_priority ASC
        LIMIT 1`,
        [name.toLowerCase().trim()]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        countryCode: row.country_code,
        regionCountryCode: row.region_country_code,
        regionCode: row.region_code,
        matchPriority: row.match_priority,
        matchType: row.match_type
      }
    } catch (error) {
      logger.error('geoLookup.findRegionByName.error', { error, name })
      return null
    }
  }
}