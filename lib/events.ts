import { EventEmitter } from 'events'
import type { NewsItem } from './types'

// Singleton EventEmitter for cross-request communication
// Used to push real-time updates to SSE clients
class NewsdeckEventEmitter extends EventEmitter {
  private static instance: NewsdeckEventEmitter

  private constructor() {
    super()
    // Increase max listeners to handle many SSE connections
    this.setMaxListeners(1000)
  }

  static getInstance(): NewsdeckEventEmitter {
    if (!NewsdeckEventEmitter.instance) {
      NewsdeckEventEmitter.instance = new NewsdeckEventEmitter()
    }
    return NewsdeckEventEmitter.instance
  }

  // Emit event when new items are added to a column
  emitNewItems(columnId: string, items: NewsItem[]) {
    this.emit(`column:${columnId}`, items)
  }

  // Listen for new items on a specific column
  onNewItems(columnId: string, callback: (items: NewsItem[]) => void) {
    this.on(`column:${columnId}`, callback)
  }

  // Remove listener for a column
  offNewItems(columnId: string, callback: (items: NewsItem[]) => void) {
    this.off(`column:${columnId}`, callback)
  }
}

export const newsdeckEvents = NewsdeckEventEmitter.getInstance()
