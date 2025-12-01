import { v4 as uuidv4 } from 'uuid'

import type { Dashboard, DashboardColumn, NewsItem } from '@/lib/types'
import { newsdeckPubSub } from '@/lib/pubsub'
import { eventQueue } from '@/lib/event-queue'

export class IngestionError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'IngestionError'
    this.status = status
  }
}

export interface IngestionDb {
  getDashboards: () => Promise<Dashboard[]>
  getColumnData: (columnId: string) => Promise<NewsItem[] | undefined>
  setColumnData: (columnId: string, items: NewsItem[]) => Promise<void>
  addNewsItems: (items: NewsItem[]) => Promise<NewsItem[]>
  // Batch operations for performance optimization
  getColumnDataBatch: (columnIds: string[]) => Promise<Record<string, NewsItem[]>>
  setColumnDataBatch: (columnData: Record<string, NewsItem[]>) => Promise<void>
  appendColumnDataBatch: (columnData: Record<string, NewsItem[]>) => Promise<void>
}

interface NormalisedPayload {
  columnId?: string
  workflowId?: string
  items: RawNewsItem[]
  extra: Record<string, unknown>
}

interface RawNewsItem extends Record<string, unknown> {
  id?: unknown // Optional source ID
  title: unknown
  flowId?: unknown
  source?: unknown
  URL?: unknown
  url?: unknown
  timestamp?: unknown
  description?: unknown
  newsValue?: unknown
  category?: unknown
  severity?: unknown
  location?: NewsItem['location']
  extra?: Record<string, unknown>
}

export interface IngestionResult {
  columnId?: string
  workflowId?: string
  itemsAdded: number
  columnsUpdated: number
  matchingColumns: string[]
  columnTotals: Record<string, number>
  insertedItems: NewsItem[]
}

interface IngestionOptions {
  now?: Date
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toOptionalTrimmed = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  return undefined
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const clampNewsValue = (value: number): number => {
  if (value < 0) return 0
  if (value > 5) return 5
  return value
}

const normalizeCoordinates = (coords: unknown): number[] | undefined => {
  if (!coords) return undefined

  // Already an array of numbers
  if (Array.isArray(coords)) {
    // Check if it's a string in an array like ["64.1333, 17.7167"]
    if (coords.length === 1 && typeof coords[0] === 'string') {
      const parts = coords[0].split(',').map(s => parseFloat(s.trim()))
      if (parts.length === 2 && parts.every(n => !isNaN(n))) {
        return parts
      }
    }
    // Check if it's already numbers like [64.1333, 17.7167]
    if (coords.every(c => typeof c === 'number')) {
      return coords as number[]
    }
  }

  // String format "64.1333, 17.7167"
  if (typeof coords === 'string') {
    const parts = coords.split(',').map(s => parseFloat(s.trim()))
    if (parts.length === 2 && parts.every(n => !isNaN(n))) {
      return parts
    }
  }

  return undefined
}

const resolveUrl = (item: RawNewsItem): string | undefined => {
  if (isNonEmptyString(item.URL)) {
    return item.URL
  }
  if (isNonEmptyString(item.url)) {
    return item.url
  }
  if (isNonEmptyString(item.source) && item.source.startsWith('http')) {
    return item.source
  }
  return undefined
}

const normalisePayload = (body: unknown): NormalisedPayload => {
  if (!isRecord(body)) {
    throw new IngestionError('Request body must be a JSON object')
  }

  let payload = body as Record<string, unknown>

  // Handle wrapped payloads like { "data-0": {...}, "data-1": { items, events } }
  // Extract the first object that contains an "items" array
  if (!Array.isArray(payload.items)) {
    const dataKeys = Object.keys(payload).filter(k => k.startsWith('data-'))
    for (const key of dataKeys) {
      const dataObj = payload[key]
      if (isRecord(dataObj) && Array.isArray(dataObj.items)) {
        payload = dataObj as Record<string, unknown>
        break
      }
    }
  }

  const events = isRecord(payload.events) ? payload.events : undefined

  let columnId = toOptionalTrimmed(payload.columnId)
  let workflowId = toOptionalTrimmed(payload.workflowId)

  if (events) {
    columnId = columnId ?? toOptionalTrimmed(events.columnId)
    workflowId = workflowId ?? toOptionalTrimmed(events.workflowId)
  }

  if (!workflowId) {
    workflowId = toOptionalTrimmed(payload.flowId)
  }

  const rawItems = Array.isArray(payload.items)
    ? (payload.items as RawNewsItem[])
    : undefined
  if (!rawItems) {
    throw new IngestionError('items array is required in request body')
  }

  const extra = isRecord(payload.extra) ? payload.extra : {}

  if (!columnId && !workflowId) {
    throw new IngestionError('Either columnId or workflowId is required in request body')
  }

  return {
    columnId,
    workflowId,
    items: rawItems,
    extra
  }
}

const resolveMatchingColumns = (
  dashboards: Dashboard[],
  workflowId: string | undefined
): string[] => {
  if (!workflowId) {
    return []
  }

  const matching = new Set<string>()

  dashboards.forEach(dashboard => {
    (dashboard.columns || []).forEach((column: DashboardColumn) => {
      if (column.flowId === workflowId) {
        matching.add(column.id)
      }
    })
  })

  return Array.from(matching)
}

export const ingestNewsItems = async (
  body: unknown,
  db: IngestionDb,
  options: IngestionOptions = {}
): Promise<IngestionResult> => {
  const { columnId, workflowId, items, extra } = normalisePayload(body)

  const now = options.now ?? new Date()
  const createdTimestamp = now.toISOString()
  const resolvedWorkflowId = columnId ?? workflowId

  if (!resolvedWorkflowId) {
    throw new IngestionError('Unable to resolve workflow or column identifier from payload')
  }

  const validatedItems = items.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new IngestionError('Each item must be an object with required fields')
    }

    // Only title is required now - id is optional (source_id)
    if (!isNonEmptyString(item.title)) {
      throw new IngestionError('Each item must have a title')
    }

    const timestamp = typeof item.timestamp === 'string' && item.timestamp
      ? item.timestamp
      : new Date().toISOString()

    return {
      id: toOptionalTrimmed(item.id), // Optional source ID
      dbId: uuidv4(),
      workflowId: resolvedWorkflowId,
      flowId: toOptionalTrimmed(item.flowId) ?? workflowId,
      source: isNonEmptyString(item.source) ? item.source : 'workflows',
      url: resolveUrl(item),
      timestamp,
      title: item.title,
      description: typeof item.description === 'string' ? item.description : undefined,
      newsValue: typeof item.newsValue === 'number' ? clampNewsValue(item.newsValue) : 3,
      category: typeof item.category === 'string' ? item.category : undefined,
      severity: (typeof item.severity === 'string' || item.severity === null)
        ? (item.severity as string | null)
        : undefined,
      location: item.location ? {
        ...item.location,
        coordinates: normalizeCoordinates(item.location.coordinates)
      } : undefined,
      extra: {
        ...(isRecord(item.extra) ? item.extra : {}),
        ...extra
      },
      raw: item,
      createdInDb: createdTimestamp
    } satisfies NewsItem
  })

  const matchingColumns = new Set<string>()

  if (columnId) {
    matchingColumns.add(columnId)
  } else {
    const dashboards = await db.getDashboards()
    resolveMatchingColumns(dashboards, workflowId).forEach(id => matchingColumns.add(id))
  }

  // IMPORTANT: Add items to news_items FIRST before setting column_data
  // (foreign key constraint requires news_item_db_id to exist)
  // addNewsItems returns items with correct db_id from database
  const insertedItems = await db.addNewsItems(validatedItems)

  let columnsUpdated = 0
  const columnTotals: Record<string, number> = {}

  // OPTIMIZED: Use batch append instead of read-modify-write (Fixes Race Condition)
  const columnIds = Array.from(matchingColumns)

  const updatedColumnData: Record<string, NewsItem[]> = {}
  for (const targetColumnId of columnIds) {
    // We only send the NEW items to be appended/upserted
    updatedColumnData[targetColumnId] = insertedItems
    columnTotals[targetColumnId] = insertedItems.length // This is just the count of added items now
    columnsUpdated += 1
  }

  await db.appendColumnDataBatch(updatedColumnData)

  // Publish to Pub/Sub for real-time updates (async, don't wait)
  const columnIdsArray = Array.from(matchingColumns)
  newsdeckPubSub.publishNewsUpdate(columnIdsArray, insertedItems).catch(() => {
    // Error already logged in pubsub service, just swallow here
  })

  // Also add to local event queue for immediate delivery (works in dev and as fallback)
  eventQueue.addItems(columnIdsArray, insertedItems)

  return {
    columnId,
    workflowId,
    itemsAdded: validatedItems.length,
    columnsUpdated,
    matchingColumns: columnIdsArray,
    columnTotals,
    insertedItems  // Return items so we can emit events
  }
}
