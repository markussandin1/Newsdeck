/**
 * Tests for GCP Secret Manager integration
 */

import { strict as assert } from 'node:assert'
import { test, describe, beforeEach, afterEach } from 'node:test'
import { secrets, clearSecretCache, getSecretFromCache } from '../secrets'

// Note: These tests run in development/test mode and use environment variables
// In production, the actual Secret Manager would be used

describe('Secrets Manager', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    // Restore environment
    Object.keys(process.env).forEach(key => delete process.env[key])
    Object.assign(process.env, originalEnv)
    clearSecretCache()
  })

  describe('Development mode', () => {
    beforeEach(() => {
      // @ts-expect-error - Need to override readonly property for testing
      process.env.NODE_ENV = 'development'
    })

    test('should use DATABASE_URL from env in development', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test'

      const dbUrl = await secrets.getDatabaseUrl()
      assert.equal(dbUrl, 'postgresql://localhost/test')
    })

    test('should use GOOGLE_CLIENT_ID from env in development', async () => {
      process.env.GOOGLE_CLIENT_ID = 'dev-client-id'

      const clientId = await secrets.getGoogleClientId()
      assert.equal(clientId, 'dev-client-id')
    })

    test('should use OAUTH_CLIENT_ID as fallback', async () => {
      process.env.OAUTH_CLIENT_ID = 'oauth-client-id'

      const clientId = await secrets.getGoogleClientId()
      assert.equal(clientId, 'oauth-client-id')
    })

    test('should use API_KEY from env in development', async () => {
      process.env.API_KEY = 'dev-api-key'

      const apiKey = await secrets.getApiKey()
      assert.equal(apiKey, 'dev-api-key')
    })

    test('should return empty string if env var not set', async () => {
      delete process.env.DATABASE_URL

      const dbUrl = await secrets.getDatabaseUrl()
      assert.equal(dbUrl, '')
    })
  })

  describe('Test mode', () => {
    beforeEach(() => {
      // @ts-expect-error - Need to override readonly property for testing
      process.env.NODE_ENV = 'test'
    })

    test('should use env vars in test mode', async () => {
      process.env.DATABASE_URL = 'postgresql://test/db'

      const dbUrl = await secrets.getDatabaseUrl()
      assert.equal(dbUrl, 'postgresql://test/db')
    })
  })

  describe('Cache functionality', () => {
    test('should return same value on multiple calls', async () => {
      // @ts-expect-error - Need to override readonly property for testing
      process.env.NODE_ENV = 'development'
      process.env.DATABASE_URL = 'postgresql://localhost/test'

      const secret1 = await secrets.getDatabaseUrl()
      const secret2 = await secrets.getDatabaseUrl()

      // Second call should return same value
      assert.equal(secret1, secret2)
    })

    test('should return undefined from cache if not cached', () => {
      const cached = getSecretFromCache('non-existent-secret')
      assert.equal(cached, undefined)
    })

    test('should clear cache without errors', () => {
      // Clearing cache should not throw
      assert.doesNotThrow(() => clearSecretCache())
    })
  })

  describe('Production mode fallback', () => {
    beforeEach(() => {
      // @ts-expect-error - Need to override readonly property for testing
      process.env.NODE_ENV = 'production'
      // Don't set GCP_PROJECT_ID to test fallback behavior
    })

    test('should fallback to env vars when GCP not configured', async () => {
      process.env.DATABASE_URL = 'postgresql://prod/db'

      const dbUrl = await secrets.getDatabaseUrl()
      assert.equal(dbUrl, 'postgresql://prod/db')
    })
  })
})
