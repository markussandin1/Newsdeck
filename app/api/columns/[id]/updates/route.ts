import { NextRequest, NextResponse } from 'next/server'
import { eventQueue } from '@/lib/event-queue'
import { logger } from '@/lib/logger'
import { GeoFilters, NewsItem } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Apply geographic filters to news items (for long-polling results)
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
      return item.regionCode && filters.regionCodes.includes(item.regionCode)
    }

    return false
  })
}

/**
 * Long-polling endpoint for real-time news updates
 *
 * Frontend calls this endpoint and waits. The server holds the connection open
 * until new items arrive (up to 25 seconds), then responds.
 *
 * This works reliably through Cloud Run load balancers unlike SSE.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const columnId = params.id

  // Get query parameters
  const { searchParams } = new URL(request.url)
  const lastSeenParam = searchParams.get('lastSeen')
  const lastSeenTimestamp = lastSeenParam ? parseInt(lastSeenParam, 10) : undefined

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

  logger.debug('longpoll.request', {
    columnId,
    lastSeenTimestamp,
    hasGeoFilters: !!geoFilters
  })

  try {
    // Wait for new items (or timeout after 25 seconds)
    const items = await eventQueue.waitForItems(columnId, lastSeenTimestamp)

    // Apply geographic filters to items from queue
    const filteredItems = applyGeographicFilters(items, geoFilters)

    const responseData = {
      success: true,
      columnId,
      items: filteredItems,
      timestamp: Date.now()
    }

    logger.debug('longpoll.response', {
      columnId,
      itemCount: filteredItems.length,
      originalItemCount: items.length,
      hasItems: filteredItems.length > 0,
      filtered: items.length !== filteredItems.length
    })

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    logger.error('longpoll.error', { error, columnId })

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        columnId,
        items: [],
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}
