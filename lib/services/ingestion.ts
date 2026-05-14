import { v4 as uuidv4 } from 'uuid'

import type { NewsItem } from '@/lib/types'
import { newsdeckPubSub } from '@/lib/pubsub'
import { eventQueue } from '@/lib/event-queue'
import { trafficCameraService } from './traffic-camera-service'
import { queueImageUpload } from './image-queue-service'

export class IngestionError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'IngestionError'
    this.status = status
  }
}

export interface IngestionDb {
  getColumnData: (columnId: string) => Promise<NewsItem[] | undefined>
  setColumnData: (columnId: string, items: NewsItem[]) => Promise<void>
  addNewsItems: (items: NewsItem[]) => Promise<NewsItem[]>
  getColumnDataBatch: (columnIds: string[]) => Promise<Record<string, NewsItem[]>>
  setColumnDataBatch: (columnData: Record<string, NewsItem[]>) => Promise<void>
  appendColumnDataBatch: (columnData: Record<string, NewsItem[]>) => Promise<void>
}

interface NormalisedPayload {
  columnId: string
  items: RawNewsItem[]
  extra: Record<string, unknown>
}

interface RawNewsItem extends Record<string, unknown> {
  id?: unknown
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
  columnId: string
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

  if (Array.isArray(coords)) {
    if (coords.length === 1 && typeof coords[0] === 'string') {
      const parts = coords[0].split(',').map(s => parseFloat(s.trim()))
      if (parts.length === 2 && parts.every(n => !isNaN(n))) {
        return parts
      }
    }
    if (coords.every(c => typeof c === 'number')) {
      return coords as number[]
    }
  }

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
  if (events) {
    columnId = columnId ?? toOptionalTrimmed(events.columnId)
  }

  let rawItems: RawNewsItem[] | undefined

  if (Array.isArray(payload.items)) {
    rawItems = payload.items as RawNewsItem[]
  } else if (isRecord(payload.item)) {
    rawItems = [payload.item as RawNewsItem]
  } else {
    rawItems = undefined
  }

  if (!rawItems) {
    throw new IngestionError('Either items array or item object is required in request body')
  }

  const extra = isRecord(payload.extra) ? payload.extra : {}

  if (!columnId) {
    throw new IngestionError('columnId is required in request body')
  }

  return {
    columnId,
    items: rawItems,
    extra
  }
}

export const ingestNewsItems = async (
  body: unknown,
  db: IngestionDb,
  options: IngestionOptions = {}
): Promise<IngestionResult> => {
  const { columnId, items, extra } = normalisePayload(body)

  const now = options.now ?? new Date()
  const createdTimestamp = now.toISOString()

  const validatedItems = await Promise.all(items.map(async (item) => {
    if (!item || typeof item !== 'object') {
      throw new IngestionError('Each item must be an object with required fields')
    }

    if (!isNonEmptyString(item.title)) {
      throw new IngestionError('Each item must have a title')
    }

    const timestamp = typeof item.timestamp === 'string' && item.timestamp
      ? item.timestamp
      : new Date().toISOString()

    const coordinates = item.location ? normalizeCoordinates(item.location.coordinates) : undefined

    // Look for nearby traffic camera if coordinates exist and category is traffic-related
    let nearbyCamera = undefined
    const isTrafficRelated = (item: { category?: unknown, source?: unknown }) => {
      const cat = typeof item.category === 'string' ? item.category.toLowerCase() : ''
      const source = typeof item.source === 'string' ? item.source.toLowerCase() : ''

      if (source === 'trafikverket') return true

      const trafficCategories = ['trafik', 'trafikolycka', 'vägarbete', 'fordonsbrand', 'kö', 'halka', 'snöoväder', 'djur']
      return trafficCategories.includes(cat)
    }

    if (coordinates && coordinates.length === 2 && isTrafficRelated(item)) {
      const [lat, lon] = coordinates
      try {
        const camera = await trafficCameraService.findNearestCamera(lat, lon, 3)

        if (camera) {
          const liveData = await trafficCameraService.fetchLiveCameraData(camera.id)

          nearbyCamera = {
            id: camera.id,
            name: camera.name,
            photoUrl: liveData?.photoUrl || camera.photoUrl,
            distance: Math.round(camera.distance * 10) / 10,
            photoTime: liveData?.photoTime || camera.photoTime,
            status: 'pending' as const
          }
        }
      } catch (error) {
        console.error('Failed to find nearby traffic camera:', error)
      }
    }

    return {
      id: toOptionalTrimmed(item.id),
      dbId: uuidv4(),
      workflowId: columnId,
      flowId: toOptionalTrimmed(item.flowId),
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
        coordinates: coordinates,
      } : undefined,
      trafficCamera: nearbyCamera,
      extra: {
        ...(isRecord(item.extra) ? item.extra : {}),
        ...extra
      },
      raw: item,
      createdInDb: createdTimestamp
    } satisfies NewsItem
  }))

  const matchingColumns = new Set<string>([columnId])

  const insertedItems = await db.addNewsItems(validatedItems)

  for (const item of insertedItems) {
    if (item.trafficCamera && item.trafficCamera.photoUrl && item.dbId) {
      queueImageUpload(item.dbId, item.trafficCamera.photoUrl).catch(error => {
        console.error(`Failed to queue image upload for ${item.dbId}:`, error)
      })
    }
  }

  let columnsUpdated = 0
  const columnTotals: Record<string, number> = {}

  const columnIds = Array.from(matchingColumns)

  const updatedColumnData: Record<string, NewsItem[]> = {}
  for (const targetColumnId of columnIds) {
    updatedColumnData[targetColumnId] = insertedItems
    columnTotals[targetColumnId] = insertedItems.length
    columnsUpdated += 1
  }

  await db.appendColumnDataBatch(updatedColumnData)

  const columnIdsArray = Array.from(matchingColumns)
  newsdeckPubSub.publishNewsUpdate(columnIdsArray, insertedItems).catch(() => {})

  eventQueue.addItems(columnIdsArray, insertedItems)

  return {
    columnId,
    itemsAdded: validatedItems.length,
    columnsUpdated,
    matchingColumns: columnIdsArray,
    columnTotals,
    insertedItems
  }
}
