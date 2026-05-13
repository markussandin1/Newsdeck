import { NextRequest } from 'next/server'
import { eventQueue } from '@/lib/event-queue'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Heartbeat interval: 30 seconds
const HEARTBEAT_INTERVAL_MS = 30_000

/**
 * Server-Sent Events endpoint for real-time news updates.
 *
 * GET /api/stream?columns=id1,id2,id3
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

  logger.debug('sse.connect', {
    columnCount: columnIds.length,
  })

  // Create a ReadableStream that stays open until the client disconnects
  let subscriptionId: string | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        } catch {
          // Controller already closed – do nothing
        }
      }

      subscriptionId = eventQueue.subscribe(columnIds, (columnId, items) => {
        if (items.length > 0) {
          send({ type: 'items', columnId, items, timestamp: Date.now() })
        }
      })

      heartbeatTimer = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() })
      }, HEARTBEAT_INTERVAL_MS)

      send({ type: 'connected', columnIds, timestamp: Date.now() })
    },

    cancel() {
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
      'X-Accel-Buffering': 'no',
    },
  })
}
