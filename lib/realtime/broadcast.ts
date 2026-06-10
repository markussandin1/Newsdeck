/**
 * Enda publiceringsvägen för nya items till realtidslagret.
 *
 * Produktionsläge: pg_notify på NOTIFY_CHANNEL — Postgres broadcastar till
 * alla instansers pg-listener (se ./pg-listener.ts), som matar sin lokala
 * eventQueue. Payloaden innehåller bara ID:n (NOTIFY har 8000-bytesgräns);
 * lyssnaren hämtar items från news_items.
 *
 * In-memory-läge (ingen DATABASE_URL): direkt till processens eventQueue.
 */
import type { NewsItem } from '@/lib/types'
import { eventQueue } from '@/lib/event-queue'
import { getPool } from '@/lib/db/pool'
import { logger } from '@/lib/logger'

export const NOTIFY_CHANNEL = 'newsdeck_news_items'

// 50 UUID:n à ~38 tecken + overhead ≈ 2 kB — god marginal till 8000-bytesgränsen
const CHUNK_SIZE = 50

export interface BroadcastPayload {
  columnIds: string[]
  dbIds: string[]
}

export type NotifyFn = (channel: string, payload: string) => Promise<void>

const pgNotify: NotifyFn = async (channel, payload) => {
  await getPool().query('SELECT pg_notify($1, $2)', [channel, payload])
}

export async function broadcastNewsItems(
  columnIds: string[],
  items: NewsItem[],
  notify: NotifyFn = pgNotify,
): Promise<void> {
  if (items.length === 0 || columnIds.length === 0) return

  if (!process.env.DATABASE_URL) {
    // In-memory-läge: leverera direkt till processens eventQueue
    eventQueue.addItems(columnIds, items)
    return
  }

  const dbIds = items
    .map(item => item.dbId)
    .filter((id): id is string => Boolean(id))

  for (let i = 0; i < dbIds.length; i += CHUNK_SIZE) {
    const payload: BroadcastPayload = {
      columnIds,
      dbIds: dbIds.slice(i, i + CHUNK_SIZE),
    }
    try {
      await notify(NOTIFY_CHANNEL, JSON.stringify(payload))
    } catch (error) {
      // Broadcast får aldrig fälla ingestion — items ligger redan i DB
      // och klienter hämtar dem vid nästa refetch.
      logger.error('realtime.broadcast.notifyError', { error, columnIds })
    }
  }
}
