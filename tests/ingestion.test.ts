import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { ingestNewsItems, IngestionError, type IngestionDb } from '../lib/services/ingestion'

const createMockDb = (): {
  db: IngestionDb
  setColumnDataCalls: Array<{ columnId: string; items: any[] }>
  addNewsItemsCalls: any[][]
  getColumnDataBatchCalls: string[][]
  setColumnDataBatchCalls: Array<Record<string, any[]>>
} => {
  const setColumnDataCalls: Array<{ columnId: string; items: any[] }> = []
  const addNewsItemsCalls: any[][] = []
  const getColumnDataBatchCalls: string[][] = []
  const setColumnDataBatchCalls: Array<Record<string, any[]>> = []

  const db: IngestionDb = {
    getDashboards: async () => [],
    getColumnData: async () => [],
    setColumnData: async (columnId, items) => {
      setColumnDataCalls.push({ columnId, items })
    },
    addNewsItems: async (items) => {
      addNewsItemsCalls.push(items)
      return items
    },
    getColumnDataBatch: async (columnIds) => {
      getColumnDataBatchCalls.push(columnIds)
      // Return empty arrays for all requested columns
      const result: Record<string, any[]> = {}
      columnIds.forEach(id => {
        result[id] = []
      })
      return result
    },
    setColumnDataBatch: async (columnData) => {
      setColumnDataBatchCalls.push(columnData)
    }
  }

  return { db, setColumnDataCalls, addNewsItemsCalls, getColumnDataBatchCalls, setColumnDataBatchCalls }
}

test('rejects payload without identifiers', async () => {
  const { db } = createMockDb()

  await assert.rejects(
    () => ingestNewsItems({ items: [{ id: '1', title: 'Test' }] }, db),
    (error: unknown) => {
      assert.ok(error instanceof IngestionError)
      assert.equal(
        (error as IngestionError).message,
        'Either columnId or workflowId is required in request body'
      )
      return true
    }
  )
})

test('ingests items directly into specified column', async () => {
  const { db, setColumnDataBatchCalls, getColumnDataBatchCalls, addNewsItemsCalls } = createMockDb()

  const now = new Date('2024-01-01T00:00:00.000Z')

  const result = await ingestNewsItems(
    {
      columnId: 'column-123',
      items: [
        {
          id: 'item-1',
          title: 'Breaking news'
        }
      ]
    },
    db,
    { now }
  )

  assert.equal(result.itemsAdded, 1)
  assert.deepEqual(result.matchingColumns, ['column-123'])
  assert.equal(result.columnsUpdated, 1)

  // Verify batch operations are used (optimization)
  assert.equal(getColumnDataBatchCalls.length, 1, 'Should use batch get')
  assert.equal(setColumnDataBatchCalls.length, 1, 'Should use batch set')
  assert.deepEqual(getColumnDataBatchCalls[0], ['column-123'])

  assert.equal(addNewsItemsCalls.length, 1)

  const batchData = setColumnDataBatchCalls[0]
  assert.ok(batchData)
  const storedItems = batchData['column-123']
  assert.ok(storedItems)
  assert.equal(storedItems.length, 1)

  const storedItem = storedItems[0]
  assert.ok(storedItem)
  assert.equal(storedItem.id, 'item-1')
  assert.equal(storedItem.createdInDb, now.toISOString())
})
