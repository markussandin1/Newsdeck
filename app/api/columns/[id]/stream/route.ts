import { NextRequest } from 'next/server'
import { newsdeckEvents } from '@/lib/events'
import type { NewsItem } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const columnId = params.id

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ type: 'connected', columnId })}\n\n`
      controller.enqueue(encoder.encode(initialMessage))

      // Listen for new items on this column
      const onNewItems = (items: NewsItem[]) => {
        const message = `data: ${JSON.stringify({ type: 'update', items })}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      newsdeckEvents.onNewItems(columnId, onNewItems)

      // Keep connection alive with heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          // Client disconnected, cleanup
          clearInterval(heartbeat)
        }
      }, 30000)

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        newsdeckEvents.offNewItems(columnId, onNewItems)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
