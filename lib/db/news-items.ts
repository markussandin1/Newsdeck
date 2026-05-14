/**
 * news_items-tabellens datalager (P2-1 steg 4).
 *
 * Innehåller CRUD och query-helpers mot news_items. Tidigare låg allt
 * inline i lib/db-postgresql.ts som metoder på persistentDb-objektet.
 *
 * Notera: column_data uppdateras inte här — den synkroniseringen sker i
 * lib/db/column-data.ts (P2-1 steg 5, kommande).
 */
import { NewsItem } from '../types'
import { logger } from '../logger'
import { getPool } from './pool'
import { buildBatchInsert } from './batch'

const SELECT_COLUMNS = `
  db_id as "dbId",
  source_id as "id",
  workflow_id as "workflowId",
  source, timestamp, title, description,
  news_value as "newsValue",
  category, severity, location, extra, raw,
  created_in_db as "createdInDb"
`

type NewsItemRow = {
  dbId: string
  id: string | null
  workflowId: string
  source: string
  timestamp: string
  title: string
  description: string | null
  newsValue: number
  category: string | null
  severity: string | null
  location: unknown
  extra: unknown
  raw: unknown
  createdInDb: string
}

function mapRow(row: NewsItemRow): NewsItem {
  const extra = typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra
  const trafficCamera = extra?.trafficCamera
  return {
    ...row,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
    extra,
    trafficCamera,
    raw: typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw,
  } as NewsItem
}

export async function addNewsItem(item: NewsItem) {
  const pool = getPool()
  const itemWithTimestamp = {
    ...item,
    createdInDb: new Date().toISOString(),
  }

  try {
    const result = await pool.query(
      `INSERT INTO news_items (
        source_id, workflow_id, source, timestamp, title, description,
        news_value, category, severity, location, extra, raw, created_in_db
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING db_id`,
      [
        item.id || null,
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
      ],
    )

    return {
      ...itemWithTimestamp,
      dbId: result.rows[0].db_id,
    }
  } catch (error) {
    logger.error('db.addNewsItem.error', { error, itemId: item.id })
    throw error
  }
}

export async function addNewsItems(items: NewsItem[]) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const itemsWithTimestamp = items.map(item => ({
      ...item,
      createdInDb: item.createdInDb || new Date().toISOString(),
    }))

    const rows = itemsWithTimestamp.map(item => [
      item.id || null,
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
    ])

    const chunks = buildBatchInsert(rows)
    const insertedItems: typeof itemsWithTimestamp = []
    let itemOffset = 0

    for (const chunk of chunks) {
      const result = await client.query(
        `INSERT INTO news_items (
          source_id, workflow_id, source, timestamp, title, description,
          news_value, category, severity, location, extra, raw, created_in_db
        ) VALUES ${chunk.text}
        RETURNING db_id`,
        chunk.values,
      )

      for (let i = 0; i < result.rows.length; i++) {
        insertedItems.push({
          ...itemsWithTimestamp[itemOffset + i],
          dbId: result.rows[i].db_id,
        })
      }
      itemOffset += result.rows.length
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
}

export async function getNewsItems() {
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLUMNS}
      FROM news_items
      ORDER BY created_in_db DESC, timestamp DESC`,
    )
    return result.rows.map(mapRow)
  } catch (error) {
    logger.error('db.getNewsItems.error', { error })
    throw error
  }
}

export async function getRecentNewsItems(limit = 10) {
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLUMNS}
      FROM news_items
      ORDER BY created_in_db DESC, timestamp DESC
      LIMIT $1`,
      [limit],
    )
    return result.rows.map(mapRow)
  } catch (error) {
    logger.error('db.getRecentNewsItems.error', { error })
    throw error
  }
}

export async function deleteNewsItem(dbId: string) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const deleteResult = await client.query(
      'DELETE FROM news_items WHERE db_id = $1',
      [dbId],
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
}

export async function getNewsItemsPaginated(limit = 50, offset = 0) {
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLUMNS}
      FROM news_items
      ORDER BY created_in_db DESC, timestamp DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset],
    )
    return result.rows.map(mapRow)
  } catch (error) {
    logger.error('db.getNewsItemsPaginated.error', { error })
    throw error
  }
}

export async function getNewsItemsByWorkflow(workflowId: string) {
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLUMNS}
      FROM news_items
      WHERE workflow_id = $1
      ORDER BY created_in_db DESC, timestamp DESC`,
      [workflowId],
    )
    return result.rows.map(mapRow)
  } catch (error) {
    logger.error('db.getNewsItemsByWorkflow.error', { error, workflowId })
    throw error
  }
}

export async function getNewsItemsByWorkflows(workflowIds: string[]) {
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLUMNS}
      FROM news_items
      WHERE workflow_id = ANY($1)
      ORDER BY created_in_db DESC, timestamp DESC`,
      [workflowIds],
    )
    return result.rows.map(mapRow)
  } catch (error) {
    logger.error('db.getNewsItemsByWorkflows.error', { error })
    throw error
  }
}

export async function getUniqueWorkflowIds() {
  const pool = getPool()
  try {
    const result = await pool.query(
      'SELECT DISTINCT workflow_id FROM news_items ORDER BY workflow_id',
    )
    return result.rows.map(row => row.workflow_id)
  } catch (error) {
    logger.error('db.getUniqueWorkflowIds.error', { error })
    throw error
  }
}

export async function getUniqueSources() {
  const pool = getPool()
  try {
    const result = await pool.query(
      'SELECT DISTINCT source FROM news_items ORDER BY source',
    )
    return result.rows.map(row => row.source)
  } catch (error) {
    logger.error('db.getUniqueSources.error', { error })
    throw error
  }
}

export async function getUniqueMunicipalities() {
  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT DISTINCT location->>'municipality' as municipality
      FROM news_items
      WHERE location->>'municipality' IS NOT NULL
      ORDER BY municipality`,
    )
    return result.rows.map(row => row.municipality)
  } catch (error) {
    logger.error('db.getUniqueMunicipalities.error', { error })
    throw error
  }
}

export async function migrateCreatedInDb() {
  const pool = getPool()
  try {
    const result = await pool.query(
      `UPDATE news_items
      SET created_in_db = timestamp
      WHERE created_in_db IS NULL`,
    )
    return { success: true, updated: result.rowCount || 0 }
  } catch (error) {
    logger.error('db.migrateCreatedInDb.error', { error })
    throw error
  }
}
