import { NextRequest } from 'next/server'
import { eventQueue } from '@/lib/event-queue'
import { logger } from '@/lib/logger'
import type { GeoFilters, NewsItem } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Heartbeat interval: 30 seconds
const HEARTBEAT_INTERVAL_MS = 30_000

/**
 * Apply geographic filters to news items (mirrors long-polling logic)
 */
function applyGeographicFilters(items: NewsItem[], filters?: GeoFilters): NewsItem[] {
  if (!filters || (filters.regionCodes.length === 0 && filters.municipalityCodes.length === 0)) {
    return items
  }

  return items.filter(item => {
    const hasLocation = !!(item.countryCode || item.regionCode || item.municipalityCode)

    if (!hasLocation) {
      return filters.showItemsWithoutLocation
    }

    // Municipality-level filtering
    if (filters.municipalityCodes.length > 0) {
      if (item.municipalityCode && filters.municipalityCodes.includes(item.municipalityCode)) {
        return true
      }

      // Region-level events where region has selected municipalities
      if (item.regionCode && !item.municipalityCode && filters.regionCodes.includes(item.regionCode)) {
        return true
      }

      return false
    }

    // Region-only filtering
    if (filters.regionCodes.length > 0) {
      return !!(item.regionCode && filters.regionCodes.includes(item.regionCode))
    }

    return false
  })
}

/**
 * Server-Sent Events endpoint for real-time news updates.
 *
 * GET /api/stream?columns=id1,id2,id3
 *              &regionCode=01&regionCode=12        (optional, repeatable)
 *              &municipalityCode=0180              (optional, repeatable)
 *              &showItemsWithoutLocation=false      (optional)
 *
 * Sends:
 *   - data: { type: "items", columnId, items: [...] }\n\n  when new items arrive
 *   - data: { type: "heartbeat", timestamp: ... }\n\n    every 30 s
 *
 * Keeps a single persistent HTTP connection instead of one per column.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Parse column IDs
  const columnsParam = searchParams.get('columns')
  const columnIds = columnsParam
    ? columnsParam.split(',').map(s => s.trim()).filter(Boolean)
    : []

  if (columnIds.length === 0) {
    return new Response('Missing required query parameter: columns', { status: 400 })
  }

  // Parse geographic filter parameters
  const geoFilters: GeoFilters | undefined = (() => {
    const regionCodes = searchParams.getAll('regionCode')
    const municipalityCodes = searchParams.getAll('municipalityCode')
    const showItemsWithoutLocation = searchParams.get('showItemsWithoutLocation') === 'true'

    if (regionCodes.length > 0 || municipalityCodes.length > 0) {
      return { regionCodes, municipalityCodes, showItemsWithoutLocation }
    }
    return undefined
  })()

  logger.debug('sse.connect', {
    columnCount: columnIds.length,
    hasGeoFilters: !!geoFilters,
  })

  // Create a ReadableStream that stays open until the client disconnects
  let subscriptionId: string | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Helper: encode an SSE message
      const send = (data: object) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        } catch {
          // Controller already closed – do nothing
        }
      }

      // Subscribe to event queue for all requested columns
      subscriptionId = eventQueue.subscribe(columnIds, (columnId, items) => {
        const filteredItems = applyGeographicFilters(items, geoFilters)
        if (filteredItems.length > 0) {
          send({ type: 'items', columnId, items: filteredItems, timestamp: Date.now() })
        }
      })

      // Send heartbeat every 30 s to keep the connection alive
      heartbeatTimer = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() })
      }, HEARTBEAT_INTERVAL_MS)

      // Send initial connected message
      send({ type: 'connected', columnIds, timestamp: Date.now() })
    },

    cancel() {
      // Client disconnected or stream closed
      if (subscriptionId) {
        eventQueue.unsubscribe(subscriptionId)
        subscriptionId = null
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }
      logger.debug('sse.disconnect', { columnCount: columnIds.length })
    },
  })

  // Also clean up when the request is aborted (e.g. client navigates away)
  request.signal.addEventListener('abort', () => {
    if (subscriptionId) {
      eventQueue.unsubscribe(subscriptionId)
      subscriptionId = null
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    logger.debug('sse.abort', { columnCount: columnIds.length })
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  })
}
