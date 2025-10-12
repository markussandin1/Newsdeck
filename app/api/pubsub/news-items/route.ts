import { NextRequest, NextResponse } from 'next/server'
import { eventQueue } from '@/lib/event-queue'
import type { NewsUpdateMessage } from '@/lib/pubsub'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint for Google Cloud Pub/Sub push subscriptions
 *
 * This receives news updates published to Pub/Sub and adds them to the event queue
 * for delivery to frontend clients via long polling.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse Pub/Sub message format
    const body = await request.json()

    // Pub/Sub sends messages in this format:
    // {
    //   "message": {
    //     "data": "base64-encoded-json",
    //     "messageId": "...",
    //     "publishTime": "..."
    //   },
    //   "subscription": "..."
    // }

    if (!body.message || !body.message.data) {
      logger.warn('pubsub.webhook.invalidFormat', { body })
      return NextResponse.json(
        { error: 'Invalid Pub/Sub message format' },
        { status: 400 }
      )
    }

    // Decode base64 data
    const messageData = Buffer.from(body.message.data, 'base64').toString('utf-8')
    const message: NewsUpdateMessage = JSON.parse(messageData)

    logger.info('pubsub.webhook.received', {
      messageId: body.message.messageId,
      columnIds: message.columnIds,
      itemCount: message.items.length,
      publishTime: body.message.publishTime
    })

    // Add items to event queue for long polling delivery
    eventQueue.addItems(message.columnIds, message.items)

    // Return 200 OK to acknowledge message
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('pubsub.webhook.error', { error })

    // Return 200 OK even on error to prevent Pub/Sub retries
    // (we don't want to keep retrying malformed messages)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 200 }
    )
  }
}

// Health check endpoint
export async function GET() {
  const stats = eventQueue.getStats()

  return NextResponse.json({
    success: true,
    service: 'pubsub-webhook',
    stats
  })
}
