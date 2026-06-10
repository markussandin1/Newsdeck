/**
 * Web Push-utskick vid ingestion. Fire-and-forget — får aldrig fälla
 * eller fördröja ingestion. Döda prenumerationer (404/410 från push-
 * tjänsten) städas bort direkt.
 */
import webpush from 'web-push'
import type { NewsItem } from '@/lib/types'
import type { PushSubscriptionRow } from '@/lib/db/push-subscriptions'
import { getPushSubscriptionsForColumns, deletePushSubscriptionByEndpoint } from '@/lib/db/push-subscriptions'
import { logger } from '@/lib/logger'

// Modulinitiering är fri från sidoeffekter — VAPID konfigureras lazy vid
// första anropet, inte vid import.
let vapidConfigured: boolean | null = null

function ensureVapid(): boolean {
  if (vapidConfigured !== null) return vapidConfigured
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    logger.warn('push.vapidMissing', { hint: 'Sätt NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY' })
    vapidConfigured = false
    return false
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:newsdeck@bonniernews.se',
    publicKey,
    privateKey,
  )
  vapidConfigured = true
  return true
}

export interface PushTarget {
  subscription: PushSubscriptionRow
  item: NewsItem
}

/** Ren urvalslogik — enhetstestad separat från nätverks-I/O. */
export function selectPushTargets(
  columnIds: string[],
  items: NewsItem[],
  subscriptions: PushSubscriptionRow[],
): PushTarget[] {
  if (items.length === 0) return []
  // Välj item med högst nyhetsvärde som notis-innehåll
  const topItem = items.reduce((best, i) => (i.newsValue > best.newsValue ? i : best), items[0])
  const columnSet = new Set(columnIds)

  return subscriptions
    .filter(sub =>
      sub.columnIds.some(id => columnSet.has(id))
      && topItem.newsValue >= sub.newsValueThreshold)
    .map(subscription => ({ subscription, item: topItem }))
}

export async function dispatchPushForItems(columnIds: string[], items: NewsItem[]): Promise<void> {
  // Utan databas finns inga prenumerationer — hoppa tyst (in-memory-dev/tester).
  if (!process.env.DATABASE_URL) return
  if (!ensureVapid()) return

  try {
    const subscriptions = await getPushSubscriptionsForColumns(columnIds)
    const targets = selectPushTargets(columnIds, items, subscriptions)
    if (targets.length === 0) return

    await Promise.allSettled(targets.map(async ({ subscription, item }) => {
      const payload = JSON.stringify({
        title: item.title,
        body: `${item.source}${item.category ? ` • ${item.category}` : ''}`,
        tag: `newsdeck-push-${item.dbId}`,
        url: '/',
      })
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          payload,
        )
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Prenumerationen är död — städa bort den
          await deletePushSubscriptionByEndpoint(subscription.endpoint)
          logger.info('push.deadSubscriptionRemoved', { userId: subscription.userId })
        } else {
          logger.error('push.sendError', { error, statusCode })
        }
      }
    }))
  } catch (error) {
    logger.error('push.dispatchError', { error })
  }
}
