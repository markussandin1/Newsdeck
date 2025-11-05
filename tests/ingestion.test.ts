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

test('ingests items into multiple columns via batch operations', async () => {
  const { db, setColumnDataBatchCalls, getColumnDataBatchCalls, addNewsItemsCalls } = createMockDb()

  // Override getDashboards to return dashboards with multiple matching columns
  db.getDashboards = async () => [
    {
      id: 'dash-1',
      name: 'Dashboard 1',
      columns: [
        {
          id: 'col-1',
          title: 'Column 1',
          flowId: 'workflow-123',
          order: 0,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'col-2',
          title: 'Column 2',
          flowId: 'workflow-123',
          order: 1,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'col-3',
          title: 'Column 3',
          flowId: 'workflow-123',
          order: 2,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      ]
    } as any
  ]

  const now = new Date('2024-01-01T00:00:00.000Z')

  const result = await ingestNewsItems(
    {
      workflowId: 'workflow-123',
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
  assert.equal(result.columnsUpdated, 3, 'Should update all 3 matching columns')
  assert.equal(result.matchingColumns.length, 3)

  // Verify the result contains all three column IDs
  const matchingColIds = result.matchingColumns.sort()
  assert.deepEqual(matchingColIds, ['col-1', 'col-2', 'col-3'])

  // Verify batch operations handle multiple columns efficiently
  assert.equal(getColumnDataBatchCalls.length, 1, 'Should use single batch get for all columns')
  assert.equal(setColumnDataBatchCalls.length, 1, 'Should use single batch set for all columns')

  // Verify all column IDs were requested in batch
  const requestedColumnIds = getColumnDataBatchCalls[0]
  assert.ok(requestedColumnIds)
  assert.equal(requestedColumnIds.length, 3)
  const sortedRequested = requestedColumnIds.sort()
  assert.deepEqual(sortedRequested, ['col-1', 'col-2', 'col-3'])

  // Verify all columns were updated in batch
  const batchData = setColumnDataBatchCalls[0]
  assert.ok(batchData)
  assert.equal(Object.keys(batchData).length, 3, 'Should update 3 columns')
  assert.ok(batchData['col-1'])
  assert.ok(batchData['col-2'])
  assert.ok(batchData['col-3'])

  // Verify each column has the item
  assert.equal(batchData['col-1']?.length, 1)
  assert.equal(batchData['col-2']?.length, 1)
  assert.equal(batchData['col-3']?.length, 1)
  assert.equal(batchData['col-1']?.[0]?.id, 'item-1')
  assert.equal(batchData['col-2']?.[0]?.id, 'item-1')
  assert.equal(batchData['col-3']?.[0]?.id, 'item-1')
})
