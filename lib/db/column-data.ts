/**
 * column_data-tabellens datalager (P2-1 steg 5).
 *
 * column_data är en denormaliserad cache av news_items per kolumn — se
 * CLAUDE.md ("Data Architecture: Denormalization Pattern"). Modulen
 * äger CRUD och batch-helpers. Sync-funktioner som behöver känna till
 * dashboards ligger fortfarande i lib/db-postgresql.ts.
 */
import { NewsItem } from '../types'
import { logger } from '../logger'
import { getPool } from './pool'
import { buildBatchInsert } from './batch'
import { getNewsItemsByWorkflow } from './news-items'

export async function setColumnData(columnId: string, items: NewsItem[]) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      'DELETE FROM column_data WHERE column_id = $1',
      [columnId],
    )

    const now = new Date().toISOString()
    const rows: unknown[][] = []
    for (const item of items) {
      if (!item.dbId) {
        logger.warn('db.setColumnData.missingDbId', { itemId: item.id })
        continue
      }
      rows.push([columnId, item.dbId, JSON.stringify(item), now])
    }

    const chunks = buildBatchInsert(rows)
    for (const chunk of chunks) {
      await client.query(
        `INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
        VALUES ${chunk.text}
        ON CONFLICT (column_id, news_item_db_id) DO UPDATE SET
          data = EXCLUDED.data,
          created_at = EXCLUDED.created_at`,
        chunk.values,
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
}

export async function getColumnData(columnId: string, limit?: number) {
  const pool = getPool()
  try {
    const query = limit
      ? `SELECT data, news_item_db_id
         FROM column_data
         WHERE column_id = $1
         ORDER BY created_at DESC LIMIT $2`
      : `SELECT data, news_item_db_id
         FROM column_data
         WHERE column_id = $1
         ORDER BY created_at DESC`

    const params: (string | number)[] = [columnId]
    if (limit) params.push(limit)

    const result = await pool.query(query, params)

    return result.rows.map(row => {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      return {
        ...data,
        dbId: row.news_item_db_id,
      }
    })
  } catch (error) {
    logger.error('db.getColumnData.error', { error, columnId })
    throw error
  }
}

/**
 * Hämtar items för flera kolumner i en query. ROW_NUMBER() begränsar
 * per kolumn så vi inte hämtar mer än `limit` per columnId.
 */
export async function getColumnDataBatch(columnIds: string[], limit: number = 500) {
  const pool = getPool()
  try {
    if (columnIds.length === 0) {
      return {}
    }

    const query = `
      SELECT column_id, data, news_item_db_id
      FROM (
        SELECT column_id, data, news_item_db_id,
               ROW_NUMBER() OVER (PARTITION BY column_id ORDER BY created_at DESC) AS rn
        FROM column_data
        WHERE column_id = ANY($1)
      ) ranked
      WHERE rn <= $2
      ORDER BY column_id, rn
    `

    const result = await pool.query(query, [columnIds, limit])

    const columnData: Record<string, NewsItem[]> = {}
    columnIds.forEach(id => { columnData[id] = [] })

    result.rows.forEach(row => {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      if (!columnData[row.column_id]) {
        columnData[row.column_id] = []
      }
      columnData[row.column_id].push({
        ...data,
        dbId: row.news_item_db_id,
      })
    })

    return columnData
  } catch (error) {
    logger.error('db.getColumnDataBatch.error', { error, columnCount: columnIds.length })
    throw error
  }
}

export async function setColumnDataBatch(columnData: Record<string, NewsItem[]>) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    const columnIds = Object.keys(columnData)
    if (columnIds.length === 0) return

    await client.query('BEGIN')

    await client.query(
      'DELETE FROM column_data WHERE column_id = ANY($1)',
      [columnIds],
    )

    const now = new Date().toISOString()
    const rows: unknown[][] = []
    for (const columnId of columnIds) {
      for (const item of columnData[columnId]) {
        if (!item.dbId) {
          logger.warn('db.setColumnDataBatch.missingDbId', { columnId, itemId: item.id })
          continue
        }
        rows.push([columnId, item.dbId, JSON.stringify(item), now])
      }
    }

    const chunks = buildBatchInsert(rows)
    for (const chunk of chunks) {
      await client.query(
        `INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
        VALUES ${chunk.text}
        ON CONFLICT (column_id, news_item_db_id) DO UPDATE SET
          data = EXCLUDED.data,
          created_at = EXCLUDED.created_at`,
        chunk.values,
      )
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
}

export async function appendColumnDataBatch(columnData: Record<string, NewsItem[]>) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    const columnIds = Object.keys(columnData)
    if (columnIds.length === 0) return

    await client.query('BEGIN')

    const now = new Date().toISOString()
    const rows: unknown[][] = []
    for (const columnId of columnIds) {
      for (const item of columnData[columnId]) {
        if (!item.dbId) {
          logger.warn('db.appendColumnDataBatch.missingDbId', { columnId, itemId: item.id })
          continue
        }
        rows.push([columnId, item.dbId, JSON.stringify(item), now])
      }
    }

    const chunks = buildBatchInsert(rows)
    for (const chunk of chunks) {
      await client.query(
        `INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
        VALUES ${chunk.text}
        ON CONFLICT (column_id, news_item_db_id) DO UPDATE SET
          data = EXCLUDED.data,
          created_at = EXCLUDED.created_at`,
        chunk.values,
      )
    }

    await client.query('COMMIT')
    logger.info('db.appendColumnDataBatch.success', { columnCount: columnIds.length, totalInserted: rows.length })
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('db.appendColumnDataBatch.error', { error })
    throw error
  } finally {
    client.release()
  }
}

/**
 * Synkar column_data från news_items för en kolumn. P2-15: använder
 * workflow_id-index istället för full table scan.
 */
export async function syncColumnDataFromGeneral(columnId: string) {
  const columnItems = await getNewsItemsByWorkflow(columnId)
  logger.debug('db.syncColumnData.start', { columnId, count: columnItems.length })
  await setColumnData(columnId, columnItems)
  logger.info('db.syncColumnData.completed', { columnId, updated: columnItems.length })
  return { success: true, itemsFound: columnItems.length, columnId }
}
