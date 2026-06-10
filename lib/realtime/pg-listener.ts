/**
 * Per-instans-lyssnare på NOTIFY-kanalen (se ./broadcast.ts).
 *
 * Håller en dedikerad pool-klient i LISTEN-läge. Vid notification hämtas
 * items från news_items (payloaden bär bara ID:n) och matas in i den
 * lokala eventQueue — som i sin tur når instansens SSE-subscribers.
 *
 * Startas lazy från /api/stream (ensureRealtimeListener). Återansluter
 * med backoff om klienten dör (Cloud SQL-restart, nätverksglapp).
 */
import type { NewsItem } from '@/lib/types'
import { eventQueue } from '@/lib/event-queue'
import { getPool } from '@/lib/db/pool'
import { getNewsItemsByDbIds } from '@/lib/db/news-items'
import { logger } from '@/lib/logger'
import { NOTIFY_CHANNEL, type BroadcastPayload } from './broadcast'

interface ListenerDeps {
  fetchItems: (dbIds: string[]) => Promise<NewsItem[]>
  addItems: (columnIds: string[], items: NewsItem[]) => void
}

const defaultDeps: ListenerDeps = {
  fetchItems: getNewsItemsByDbIds,
  addItems: (columnIds, items) => eventQueue.addItems(columnIds, items),
}

export async function handleNotificationPayload(
  payload: string | undefined,
  deps: ListenerDeps = defaultDeps,
): Promise<void> {
  if (!payload) return
  try {
    const parsed = JSON.parse(payload) as BroadcastPayload
    if (!Array.isArray(parsed.columnIds) || !Array.isArray(parsed.dbIds)) {
      logger.warn('realtime.listener.invalidPayload', { payload })
      return
    }
    if (parsed.dbIds.length === 0) return

    const items = await deps.fetchItems(parsed.dbIds)
    if (items.length > 0) {
      deps.addItems(parsed.columnIds, items)
    }
  } catch (error) {
    logger.error('realtime.listener.payloadError', { error })
  }
}

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30_000

let started = false

export function ensureRealtimeListener(): void {
  if (started) return
  if (!process.env.DATABASE_URL) return // in-memory-läge: broadcast går direkt till kön
  started = true
  void listenLoop()
}

async function listenLoop(): Promise<void> {
  let backoff = RECONNECT_BASE_MS
  for (;;) {
    try {
      const client = await getPool().connect()
      try {
        client.on('notification', msg => {
          void handleNotificationPayload(msg.payload)
        })
        await client.query(`LISTEN ${NOTIFY_CHANNEL}`)
        logger.info('realtime.listener.connected', { channel: NOTIFY_CHANNEL })
        backoff = RECONNECT_BASE_MS

        // Blockera tills klienten dör — LISTEN kräver en levande session.
        await new Promise<void>((_resolve, reject) => {
          client.once('error', reject)
          client.once('end', () => reject(new Error('pg listener connection ended')))
        })
      } finally {
        // release(true) kastar klienten ur poolen — den kan vara trasig.
        client.release(true)
      }
    } catch (error) {
      logger.error('realtime.listener.disconnected', { error, retryInMs: backoff })
    }
    await new Promise(resolve => setTimeout(resolve, backoff))
    backoff = Math.min(backoff * 2, RECONNECT_MAX_MS)
  }
}
