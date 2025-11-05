/**
 * Tests for GCP Secret Manager integration
 */

import { secrets, clearSecretCache, getSecretFromCache } from '../secrets'

// Mock the Secret Manager client
jest.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: jest.fn().mockImplementation(() => ({
    accessSecretVersion: jest.fn().mockResolvedValue([
      {
        payload: {
          data: Buffer.from('mock-secret-value')
        }
      }
    ])
  }))
}))

describe('Secrets Manager', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv }
    clearSecretCache()
  })

  afterEach(() => {
    // Restore environment
    process.env = originalEnv
  })

  describe('Development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should use DATABASE_URL from env in development', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test'

      const dbUrl = await secrets.getDatabaseUrl()
      expect(dbUrl).toBe('postgresql://localhost/test')
    })

    it('should use GOOGLE_CLIENT_ID from env in development', async () => {
      process.env.GOOGLE_CLIENT_ID = 'dev-client-id'

      const clientId = await secrets.getGoogleClientId()
      expect(clientId).toBe('dev-client-id')
    })

    it('should use OAUTH_CLIENT_ID as fallback', async () => {
      process.env.OAUTH_CLIENT_ID = 'oauth-client-id'

      const clientId = await secrets.getGoogleClientId()
      expect(clientId).toBe('oauth-client-id')
    })

    it('should use API_KEY from env in development', async () => {
      process.env.API_KEY = 'dev-api-key'

      const apiKey = await secrets.getApiKey()
      expect(apiKey).toBe('dev-api-key')
    })

    it('should return empty string if env var not set', async () => {
      const dbUrl = await secrets.getDatabaseUrl()
      expect(dbUrl).toBe('')
    })
  })

  describe('Test mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test'
    })

    it('should use env vars in test mode', async () => {
      process.env.DATABASE_URL = 'postgresql://test/db'

      const dbUrl = await secrets.getDatabaseUrl()
      expect(dbUrl).toBe('postgresql://test/db')
    })
  })

  describe('Cache functionality', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      process.env.DATABASE_URL = 'postgresql://localhost/test'
    })

    it('should cache secrets', async () => {
      const secret1 = await secrets.getDatabaseUrl()
      const secret2 = await secrets.getDatabaseUrl()

      // Second call should use cached value (same reference)
      expect(secret1).toBe(secret2)
    })

    it('should return cached secret from getSecretFromCache', async () => {
      process.env.NODE_ENV = 'production'

      // This will cache the secret (in production mode, it would fetch from Secret Manager)
      await secrets.getDatabaseUrl()

      // Get from cache
      const cached = getSecretFromCache('newsdeck-database-url')
      expect(cached).toBeDefined()
    })

    it('should return undefined from cache if not cached', () => {
      const cached = getSecretFromCache('non-existent-secret')
      expect(cached).toBeUndefined()
    })

    it('should clear cache', async () => {
      await secrets.getDatabaseUrl()

      clearSecretCache()

      const cached = getSecretFromCache('newsdeck-database-url')
      expect(cached).toBeUndefined()
    })
  })

  describe('Production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.GCP_PROJECT_ID = 'test-project'
    })

    it('should fetch from Secret Manager in production', async () => {
      // This test would actually call Secret Manager (mocked above)
      const dbUrl = await secrets.getDatabaseUrl()

      // The mock returns 'mock-secret-value'
      expect(dbUrl).toBe('mock-secret-value')
    })
  })
})
