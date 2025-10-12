import { PubSub } from '@google-cloud/pubsub'
import type { NewsItem } from './types'
import { logger } from './logger'

const pubsub = new PubSub({
  projectId: process.env.GCP_PROJECT_ID || 'newsdeck-473620'
})

const TOPIC_NAME = 'newsdeck-news-items'

export interface NewsUpdateMessage {
  columnIds: string[]
  items: NewsItem[]
  timestamp: string
}

class NewsDeckPubSub {
  private topic = pubsub.topic(TOPIC_NAME)

  /**
   * Publish news items update to Pub/Sub
   */
  async publishNewsUpdate(columnIds: string[], items: NewsItem[]): Promise<void> {
    // Skip if no Pub/Sub in development (will use local EventEmitter instead)
    if (process.env.NODE_ENV === 'development' && !process.env.PUBSUB_EMULATOR_HOST) {
      logger.debug('pubsub.skip', { reason: 'development mode without emulator' })
      return
    }

    try {
      const message: NewsUpdateMessage = {
        columnIds,
        items,
        timestamp: new Date().toISOString()
      }

      const messageId = await this.topic.publishMessage({
        json: message
      })

      logger.info('pubsub.published', {
        messageId,
        columnIds,
        itemCount: items.length
      })
    } catch (error) {
      logger.error('pubsub.publishError', { error, columnIds, itemCount: items.length })
      // Don't throw - we don't want Pub/Sub failures to break ingestion
    }
  }

  /**
   * Verify that Pub/Sub topic exists and is accessible
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const [exists] = await this.topic.exists()
      if (!exists) {
        logger.warn('pubsub.topicNotFound', { topic: TOPIC_NAME })
        return false
      }
      logger.info('pubsub.connected', { topic: TOPIC_NAME })
      return true
    } catch (error) {
      logger.error('pubsub.connectionError', { error, topic: TOPIC_NAME })
      return false
    }
  }
}

export const newsdeckPubSub = new NewsDeckPubSub()
