import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { logger } from './logger'

const client = new SecretManagerServiceClient()
const projectId = process.env.GCP_PROJECT_ID || 'newsdeck-473620'

// Cache för secrets med TTL
interface CachedSecret {
  value: string
  expiresAt: number
}

const secretCache = new Map<string, CachedSecret>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minuter

/**
 * Hämta secret från GCP Secret Manager med caching
 */
async function getSecret(secretName: string): Promise<string> {
  // Check cache först
  const cached = secretCache.get(secretName)
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug('secrets.cache.hit', { secretName })
    return cached.value
  }

  try {
    const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`
    const [version] = await client.accessSecretVersion({ name: secretPath })

    const secretValue = version.payload?.data?.toString()
    if (!secretValue) {
      throw new Error(`Secret ${secretName} is empty`)
    }

    // Cache secret
    secretCache.set(secretName, {
      value: secretValue,
      expiresAt: Date.now() + CACHE_TTL
    })

    logger.info('secrets.fetched', { secretName })
    return secretValue

  } catch (error) {
    logger.error('secrets.fetchError', { error, secretName })

    // Fallback till environment variable för lokal utveckling
    const envVarName = secretName.replace('newsdeck-', '').toUpperCase().replace(/-/g, '_')
    const envValue = process.env[envVarName]
    if (envValue) {
      logger.warn('secrets.fallbackToEnv', { secretName, envVarName })
      return envValue
    }

    throw new Error(`Failed to fetch secret: ${secretName}`)
  }
}

/**
 * Pre-load alla kritiska secrets vid application start
 */
export async function initializeSecrets(): Promise<void> {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    logger.info('secrets.skip', { reason: `${process.env.NODE_ENV} mode` })
    return
  }

  const criticalSecrets = [
    'newsdeck-database-url',
    'newsdeck-nextauth-secret',
    'newsdeck-google-client-id',
    'newsdeck-google-client-secret',
    'newsdeck-api-key'
  ]

  logger.info('secrets.initializing', { count: criticalSecrets.length })

  await Promise.all(
    criticalSecrets.map(async (secret) => {
      try {
        await getSecret(secret)
      } catch (error) {
        logger.error('secrets.initError', { error, secret })
        // Don't throw - vi vill att appen ska starta även om en secret misslyckas
      }
    })
  )

  logger.info('secrets.initialized')
}

/**
 * Exporterade getters för varje secret
 */
export const secrets = {
  async getDatabaseUrl(): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      return getSecret('newsdeck-database-url')
    }
    return process.env.DATABASE_URL || ''
  },

  async getNextAuthSecret(): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      return getSecret('newsdeck-nextauth-secret')
    }
    return process.env.NEXTAUTH_SECRET || ''
  },

  async getGoogleClientId(): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      return getSecret('newsdeck-google-client-id')
    }
    return process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || ''
  },

  async getGoogleClientSecret(): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      return getSecret('newsdeck-google-client-secret')
    }
    return process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || ''
  },

  async getApiKey(): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      return getSecret('newsdeck-api-key')
    }
    return process.env.API_KEY || ''
  }
}

/**
 * Clear cache (användbart för testing och secret rotation)
 */
export function clearSecretCache(): void {
  secretCache.clear()
  logger.info('secrets.cache.cleared')
}

/**
 * Get secret synchronously from cache only (för performance-kritiska paths)
 * Returns undefined om secret inte är cachad
 */
export function getSecretFromCache(secretName: string): string | undefined {
  const cached = secretCache.get(secretName)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }
  return undefined
}
