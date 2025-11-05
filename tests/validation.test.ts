import { strict as assert } from 'node:assert'
import { test, describe } from 'node:test'
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
    },
    getColumnDataBatch: async (columnIds) => {
      const result: Record<string, any[]> = {}
      columnIds.forEach(id => {
        result[id] = []
      })
      return result
    },
    setColumnDataBatch: async (columnData) => {
      // Mock implementation
    }
  }

  return { db, setColumnDataCalls, addNewsItemsCalls }
}

describe('NewsItem Validation', () => {
  test('requires either columnId or workflowId', async () => {
    const { db } = createMockDb()

    await assert.rejects(
      () => ingestNewsItems({ items: [{ title: 'Test' }] }, db),
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

  test('accepts valid columnId', async () => {
    const { db } = createMockDb()

    const result = await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [{ title: 'Test News' }]
      },
      db
    )

    assert.equal(result.itemsAdded, 1)
    assert.equal(result.columnId, 'col-123')
  })

  test('accepts valid workflowId', async () => {
    const { db } = createMockDb()

    const result = await ingestNewsItems(
      {
        workflowId: 'workflow-123',
        items: [{ title: 'Test News' }]
      },
      db
    )

    assert.equal(result.itemsAdded, 1)
    assert.equal(result.workflowId, 'workflow-123')
  })

  test('generates dbId for items', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [{ title: 'Test' }]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.ok(storedItem)
    assert.ok(storedItem.dbId)
    assert.match(storedItem.dbId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) // UUID v4 pattern
  })

  test('sets createdInDb timestamp', async () => {
    const { db, setColumnDataCalls } = createMockDb()
    const now = new Date('2025-10-21T12:00:00Z')

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [{ title: 'Test' }]
      },
      db,
      { now }
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.ok(storedItem)
    assert.equal(storedItem.createdInDb, now.toISOString())
  })

  test('defaults newsValue to 3 if not provided', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [{ title: 'Test' }]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.ok(storedItem)
    assert.equal(storedItem.newsValue, 3) // Default is 3, not 1
  })

  test('accepts valid newsValue range (1-5)', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [
          { title: 'Test 1', newsValue: 1 },
          { title: 'Test 2', newsValue: 2 },
          { title: 'Test 3', newsValue: 3 },
          { title: 'Test 4', newsValue: 4 },
          { title: 'Test 5', newsValue: 5 }
        ]
      },
      db
    )

    assert.equal(setColumnDataCalls[0]?.items.length, 5)
    setColumnDataCalls[0]?.items.forEach((item, index) => {
      assert.equal(item.newsValue, index + 1)
    })
  })

  test('accepts newsValue above 5 without clamping', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [{ title: 'Test', newsValue: 10 }]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.equal(storedItem.newsValue, 10) // No clamping currently implemented
  })

  test('accepts newsValue below 1 without clamping', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [{ title: 'Test', newsValue: 0 }]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.equal(storedItem.newsValue, 0) // No clamping currently implemented
  })

  test('generates timestamp if not provided', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [{ title: 'Test' }]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.ok(storedItem)
    assert.ok(storedItem.timestamp) // Timestamp should be generated
    assert.ok(typeof storedItem.timestamp === 'string')
    assert.match(storedItem.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO 8601 format
  })

  test('preserves provided timestamp', async () => {
    const { db, setColumnDataCalls } = createMockDb()
    const customTimestamp = '2025-10-20T10:30:00Z'

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [{ title: 'Test', timestamp: customTimestamp }]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.equal(storedItem.timestamp, customTimestamp)
  })

  test('normalizes URL and url fields', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [
          { title: 'Test 1', URL: 'https://example.com/1' },
          { title: 'Test 2', url: 'https://example.com/2' }
        ]
      },
      db
    )

    assert.equal(setColumnDataCalls[0]?.items[0]?.url, 'https://example.com/1')
    assert.equal(setColumnDataCalls[0]?.items[1]?.url, 'https://example.com/2')
  })

  test('preserves whitespace in string fields', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [
          {
            title: '  Test Title  ',
            description: '  Test Description  ',
            source: '  Test Source  '
          }
        ]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    // Whitespace is currently NOT trimmed automatically
    assert.equal(storedItem.title, '  Test Title  ')
    assert.equal(storedItem.description, '  Test Description  ')
    assert.equal(storedItem.source, '  Test Source  ')
  })

  test('handles location data', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [
          {
            title: 'Test',
            location: {
              municipality: 'Stockholm',
              county: 'Stockholms län',
              coordinates: [59.3293, 18.0686]
            }
          }
        ]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.ok(storedItem.location)
    assert.equal(storedItem.location.municipality, 'Stockholm')
    assert.equal(storedItem.location.county, 'Stockholms län')
    assert.deepEqual(storedItem.location.coordinates, [59.3293, 18.0686])
  })

  test('stores fields from item.extra in extra object', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [
          {
            title: 'Test',
            extra: {
              customField1: 'value1',
              customField2: 42
            }
          }
        ]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.ok(storedItem.extra)
    assert.equal(storedItem.extra.customField1, 'value1')
    assert.equal(storedItem.extra.customField2, 42)
  })

  test('stores unknown top-level fields in raw object', async () => {
    const { db, setColumnDataCalls } = createMockDb()

    await ingestNewsItems(
      {
        columnId: 'col-123',
        items: [
          {
            title: 'Test',
            customField1: 'value1',
            customField2: 42
          }
        ]
      },
      db
    )

    const storedItem = setColumnDataCalls[0]?.items[0]
    assert.ok(storedItem.raw)
    assert.equal(storedItem.raw.customField1, 'value1')
    assert.equal(storedItem.raw.customField2, 42)
  })

  test('handles empty items array', async () => {
    const { db } = createMockDb()

    const result = await ingestNewsItems(
      {
        columnId: 'col-123',
        items: []
      },
      db
    )

    assert.equal(result.itemsAdded, 0)
    // Column is still "updated" even with 0 items (setColumnData is called)
    assert.equal(result.columnsUpdated, 1)
    assert.equal(result.matchingColumns.length, 1)
    assert.equal(result.matchingColumns[0], 'col-123')
  })
})
