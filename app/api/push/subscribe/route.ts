import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST: skapa/uppdatera prenumeration. DELETE: ta bort (vid avstängning). */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      columnIds?: string[]
      newsValueThreshold?: number
    }

    const { subscription, columnIds, newsValueThreshold } = body
    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
    }

    await db.upsertPushSubscription({
      userId: session.user.email,
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      columnIds: Array.isArray(columnIds) ? columnIds : [],
      newsValueThreshold: typeof newsValueThreshold === 'number' ? newsValueThreshold : 4,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('api.push.subscribe.error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { endpoint } = await request.json() as { endpoint?: string }
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint is required' }, { status: 400 })
    }
    await db.deletePushSubscription(endpoint, session.user.email)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('api.push.unsubscribe.error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
