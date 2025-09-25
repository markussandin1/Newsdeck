import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { ingestNewsItems, IngestionError, type IngestionDb } from '../lib/services/ingestion'

const createMockDb = (): {
  db: IngestionDb
  setColumnDataCalls: Array<{ columnId: string; items: any[] }>
  addNewsItemsCalls: any[][]
} => {
  const setColumnDataCalls: Array<{ columnId: string; items: any[] }> = []
  const addNewsItemsCalls: any[][] = []

  const db: IngestionDb = {
    getDashboards: async () => [],
    getColumnData: async () => [],
    setColumnData: async (columnId, items) => {
      setColumnDataCalls.push({ columnId, items })
    },
    addNewsItems: async (items) => {
      addNewsItemsCalls.push(items)
      return items
    }
  }

  return { db, setColumnDataCalls, addNewsItemsCalls }
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
  const { db, setColumnDataCalls, addNewsItemsCalls } = createMockDb()

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
  assert.equal(setColumnDataCalls.length, 1)
  assert.equal(addNewsItemsCalls.length, 1)
  assert.equal(setColumnDataCalls[0]?.columnId, 'column-123')

  const storedItem = setColumnDataCalls[0]?.items[0]
  assert.ok(storedItem)
  assert.equal(storedItem.id, 'item-1')
  assert.equal(storedItem.createdInDb, now.toISOString())
})
