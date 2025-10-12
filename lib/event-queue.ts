import type { NewsItem } from './types'
import { logger } from './logger'

interface QueuedUpdate {
  items: NewsItem[]
  timestamp: number
}

interface PendingRequest {
  resolve: (items: NewsItem[]) => void
  timeout: NodeJS.Timeout
  columnId: string
}

/**
 * In-memory queue for news updates per column
 * Used for long-polling to deliver real-time updates
 */
class EventQueue {
  // Queue of updates per column (FIFO)
  private queues: Map<string, QueuedUpdate[]> = new Map()

  // Pending long-poll requests waiting for updates
  private pendingRequests: Map<string, PendingRequest[]> = new Map()

  // Max items to keep in queue per column
  private readonly MAX_QUEUE_SIZE = 100

  // Max age of items in queue (5 minutes)
  private readonly MAX_AGE_MS = 5 * 60 * 1000

  // Long poll timeout (25 seconds)
  private readonly LONG_POLL_TIMEOUT_MS = 25 * 1000

  /**
   * Add news items to column queues and notify waiting requests
   */
  addItems(columnIds: string[], items: NewsItem[]): void {
    const update: QueuedUpdate = {
      items,
      timestamp: Date.now()
    }

    logger.debug('eventQueue.addItems', {
      columnIds,
      itemCount: items.length
    })

    for (const columnId of columnIds) {
      // Add to queue
      const queue = this.queues.get(columnId) || []
      queue.push(update)

      // Trim old items
      this.trimQueue(queue)
      this.queues.set(columnId, queue)

      // Notify pending requests for this column
      this.notifyPendingRequests(columnId, items)
    }
  }

  /**
   * Wait for new items (long polling)
   * Returns immediately if items are available, otherwise waits up to timeout
   */
  async waitForItems(columnId: string, lastSeenTimestamp?: number): Promise<NewsItem[]> {
    // Check if we have items newer than lastSeenTimestamp
    const existingItems = this.getNewItems(columnId, lastSeenTimestamp)
    if (existingItems.length > 0) {
      logger.debug('eventQueue.immediateReturn', {
        columnId,
        itemCount: existingItems.length
      })
      return existingItems
    }

    // No items available, wait for new ones (long polling)
    return new Promise<NewsItem[]>((resolve) => {
      const timeout = setTimeout(() => {
        // Remove from pending requests
        this.removePendingRequest(columnId, resolve)

        logger.debug('eventQueue.timeout', { columnId })
        resolve([]) // Return empty array on timeout
      }, this.LONG_POLL_TIMEOUT_MS)

      const pendingRequest: PendingRequest = {
        resolve,
        timeout,
        columnId
      }

      // Add to pending requests
      const pending = this.pendingRequests.get(columnId) || []
      pending.push(pendingRequest)
      this.pendingRequests.set(columnId, pending)

      logger.debug('eventQueue.waitingForItems', {
        columnId,
        pendingCount: pending.length
      })
    })
  }

  /**
   * Get new items since lastSeenTimestamp
   */
  private getNewItems(columnId: string, lastSeenTimestamp?: number): NewsItem[] {
    const queue = this.queues.get(columnId)
    if (!queue || queue.length === 0) {
      return []
    }

    const cutoff = lastSeenTimestamp || 0
    const newUpdates = queue.filter(update => update.timestamp > cutoff)

    // Flatten all items from matching updates
    return newUpdates.flatMap(update => update.items)
  }

  /**
   * Notify all pending requests for a column
   */
  private notifyPendingRequests(columnId: string, items: NewsItem[]): void {
    const pending = this.pendingRequests.get(columnId)
    if (!pending || pending.length === 0) {
      return
    }

    logger.debug('eventQueue.notifyPending', {
      columnId,
      pendingCount: pending.length,
      itemCount: items.length
    })

    // Notify all waiting requests
    for (const request of pending) {
      clearTimeout(request.timeout)
      request.resolve(items)
    }

    // Clear pending requests for this column
    this.pendingRequests.delete(columnId)
  }

  /**
   * Remove a specific pending request
   */
  private removePendingRequest(
    columnId: string,
    resolve: (items: NewsItem[]) => void
  ): void {
    const pending = this.pendingRequests.get(columnId)
    if (!pending) return

    const filtered = pending.filter(req => req.resolve !== resolve)
    if (filtered.length > 0) {
      this.pendingRequests.set(columnId, filtered)
    } else {
      this.pendingRequests.delete(columnId)
    }
  }

  /**
   * Remove old items from queue
   */
  private trimQueue(queue: QueuedUpdate[]): void {
    const now = Date.now()
    const maxAge = now - this.MAX_AGE_MS

    // Remove items older than MAX_AGE_MS
    const filtered = queue.filter(update => update.timestamp > maxAge)

    // Keep only last MAX_QUEUE_SIZE items
    if (filtered.length > this.MAX_QUEUE_SIZE) {
      queue.splice(0, filtered.length - this.MAX_QUEUE_SIZE)
    }
  }

  /**
   * Get stats for monitoring
   */
  getStats(): {
    queuedColumns: number
    totalQueuedItems: number
    pendingRequests: number
  } {
    let totalItems = 0
    for (const queue of Array.from(this.queues.values())) {
      totalItems += queue.reduce((sum, update) => sum + update.items.length, 0)
    }

    let totalPending = 0
    for (const pending of Array.from(this.pendingRequests.values())) {
      totalPending += pending.length
    }

    return {
      queuedColumns: this.queues.size,
      totalQueuedItems: totalItems,
      pendingRequests: totalPending
    }
  }

  /**
   * Clear all queues and pending requests (for testing)
   */
  clear(): void {
    // Clear all pending timeouts
    for (const pending of Array.from(this.pendingRequests.values())) {
      for (const request of pending) {
        clearTimeout(request.timeout)
        request.resolve([])
      }
    }

    this.queues.clear()
    this.pendingRequests.clear()
    logger.info('eventQueue.cleared')
  }
}

// Singleton instance
export const eventQueue = new EventQueue()
