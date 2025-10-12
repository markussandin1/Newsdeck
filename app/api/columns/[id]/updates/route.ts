import { NextRequest, NextResponse } from 'next/server'
import { eventQueue } from '@/lib/event-queue'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  // Get lastSeenTimestamp from query parameter
  const { searchParams } = new URL(request.url)
  const lastSeenParam = searchParams.get('lastSeen')
  const lastSeenTimestamp = lastSeenParam ? parseInt(lastSeenParam, 10) : undefined

  logger.debug('longpoll.request', {
    columnId,
    lastSeenTimestamp
  })

  try {
    // Wait for new items (or timeout after 25 seconds)
    const items = await eventQueue.waitForItems(columnId, lastSeenTimestamp)

    const responseData = {
      success: true,
      columnId,
      items,
      timestamp: Date.now()
    }

    logger.debug('longpoll.response', {
      columnId,
      itemCount: items.length,
      hasItems: items.length > 0
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
