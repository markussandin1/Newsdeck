import type { NewsItem } from './types'
import { logger } from './logger'

/** Callback-typ för SSE-prenumeranter */
type ColumnCallback = (columnId: string, items: NewsItem[]) => void

/**
 * In-memory pub/sub för SSE-leverans inom en instans.
 * Matas uteslutande av realtime-lagret (lib/realtime/) — antingen
 * pg-listenern (produktion) eller broadcastNewsItems direkt (in-memory-dev).
 * Ingen replay: missade events täcks av klientens refetch vid reconnect.
 */
class EventQueue {
  private subscribers: Map<string, { columnIds: Set<string>; callback: ColumnCallback }> = new Map()

  addItems(columnIds: string[], items: NewsItem[]): void {
    if (items.length === 0) return
    logger.debug('eventQueue.addItems', { columnIds, itemCount: items.length })
    for (const columnId of columnIds) {
      for (const sub of Array.from(this.subscribers.values())) {
        if (sub.columnIds.has(columnId)) {
          try {
            sub.callback(columnId, items)
          } catch {
            // Prenumerant kan ha stängts; SSE-routen hanterar sina egna fel
          }
        }
      }
    }
  }

  subscribe(columnIds: string[], callback: ColumnCallback): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`
    this.subscribers.set(id, { columnIds: new Set(columnIds), callback })
    logger.debug('eventQueue.subscribe', { id, columnCount: columnIds.length })
    return id
  }

  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId)
    logger.debug('eventQueue.unsubscribe', { id: subscriptionId })
  }

  getStats(): { sseSubscribers: number } {
    return { sseSubscribers: this.subscribers.size }
  }

  /** Rensa allt (för tester) */
  clear(): void {
    this.subscribers.clear()
    logger.info('eventQueue.cleared')
  }
}

export const eventQueue = new EventQueue()
