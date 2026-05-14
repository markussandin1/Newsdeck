import { PubSub, type Topic } from '@google-cloud/pubsub'
import type { NewsItem } from './types'
import { logger } from './logger'

const TOPIC_NAME = 'newsdeck-news-items'

export interface NewsUpdateMessage {
  columnIds: string[]
  items: NewsItem[]
  timestamp: string
}

// P3-3: GCP_PROJECT_ID är obligatorisk i produktion, men checken sker
// lazy vid första publish-anrop — INTE vid modul-import. Build-tiden
// (Next.js "Collecting page data") importerar route-moduler utan att
// köra dem, och env-variabeln finns inte där. Tidigare throw vid import
// gjorde build:n omöjlig.
let pubsubInstance: PubSub | null = null
let topicInstance: Topic | null = null

function getTopic(): Topic | null {
  if (topicInstance) return topicInstance

  const projectId = process.env.GCP_PROJECT_ID
  if (!projectId) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('pubsub.missingProjectId', {
        hint: 'Set GCP_PROJECT_ID in Cloud Run env. Pub/Sub publishing disabled until then.',
      })
    }
    return null
  }

  if (!pubsubInstance) pubsubInstance = new PubSub({ projectId })
  topicInstance = pubsubInstance.topic(TOPIC_NAME)
  return topicInstance
}

class NewsDeckPubSub {
  private get topic(): Topic | null {
    return getTopic()
  }

  /**
   * Publish news items update to Pub/Sub
   */
  async publishNewsUpdate(columnIds: string[], items: NewsItem[]): Promise<void> {
    // Skip if no Pub/Sub in development or test (will use local EventEmitter instead)
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && !process.env.PUBSUB_EMULATOR_HOST) {
      logger.debug('pubsub.skip', { reason: `${process.env.NODE_ENV} mode without emulator` })
      return
    }

    const topic = this.topic
    if (!topic) {
      // GCP_PROJECT_ID saknas; loggas redan i getTopic. Hoppa över publishen
      // istället för att krascha ingestion.
      return
    }

    try {
      const message: NewsUpdateMessage = {
        columnIds,
        items,
        timestamp: new Date().toISOString()
      }

      const messageId = await topic.publishMessage({
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
    const topic = this.topic
    if (!topic) return false
    try {
      const [exists] = await topic.exists()
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
