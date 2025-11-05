/**
 * Rate limiting for API endpoints
 *
 * Uses PostgreSQL for rate limiting (no external dependencies).
 * Simple sliding window implementation with database cleanup.
 */

import { Pool } from 'pg'
import { parse } from 'pg-connection-string'

// Rate limit configuration
// Conservative limit that protects against workflow bugs while allowing normal operation
// Adjust based on actual production traffic patterns
const RATE_LIMIT_MAX_REQUESTS = 500 // requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute in milliseconds

// PostgreSQL connection pool for rate limiting
let rateLimitPool: Pool | null = null

// Initialize rate limiting database connection
if (process.env.DATABASE_URL) {
  const config = parse(process.env.DATABASE_URL)

  rateLimitPool = new Pool({
    host: config.host || undefined,
    port: config.port ? parseInt(config.port) : undefined,
    database: config.database || undefined,
    user: config.user || undefined,
    password: config.password || undefined,
    // Small pool just for rate limiting
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

  console.log('✅ Rate limiting enabled with PostgreSQL')

  // Create rate_limit_log table if it doesn't exist
  initRateLimitTable().catch(err => {
    console.error('Failed to initialize rate limit table:', err)
  })
} else {
  console.warn('⚠️  Rate limiting disabled: DATABASE_URL not set')
  console.warn('   This is OK for local development, but REQUIRED in production!')
}

/**
 * Initialize rate limiting table
 */
async function initRateLimitTable(): Promise<void> {
  if (!rateLimitPool) return

  try {
    await rateLimitPool.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_log (
        identifier TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (identifier, timestamp)
      );

      -- Index for fast cleanup and counting
      CREATE INDEX IF NOT EXISTS idx_rate_limit_timestamp
      ON rate_limit_log(timestamp DESC);
    `)
  } catch (error) {
    console.error('Error creating rate_limit_log table:', error)
  }
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, workflow ID)
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const resetTime = now + RATE_LIMIT_WINDOW_MS

  // If rate limiting is not configured, allow all requests (development)
  if (!rateLimitPool) {
    return {
      success: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      reset: resetTime,
    }
  }

  try {
    // Start transaction for atomic check-and-insert
    const client = await rateLimitPool.connect()

    try {
      await client.query('BEGIN')

      // Clean up old entries (older than window) for this identifier
      await client.query(
        `DELETE FROM rate_limit_log
         WHERE identifier = $1 AND timestamp < $2`,
        [identifier, new Date(windowStart)]
      )

      // Count requests in current window
      const countResult = await client.query(
        `SELECT COUNT(*)::int as count
         FROM rate_limit_log
         WHERE identifier = $1 AND timestamp >= $2`,
        [identifier, new Date(windowStart)]
      )

      const currentCount = countResult.rows[0]?.count || 0
      const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - currentCount - 1)

      // Check if rate limit exceeded
      if (currentCount >= RATE_LIMIT_MAX_REQUESTS) {
        await client.query('COMMIT')
        client.release()

        return {
          success: false,
          limit: RATE_LIMIT_MAX_REQUESTS,
          remaining: 0,
          reset: resetTime,
        }
      }

      // Log this request
      await client.query(
        `INSERT INTO rate_limit_log (identifier, timestamp)
         VALUES ($1, $2)`,
        [identifier, new Date(now)]
      )

      await client.query('COMMIT')
      client.release()

      return {
        success: true,
        limit: RATE_LIMIT_MAX_REQUESTS,
        remaining,
        reset: resetTime,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      client.release()
      throw error
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // On error, allow the request (fail open)
    return {
      success: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      reset: resetTime,
    }
  }
}

/**
 * Get the identifier for rate limiting
 * Uses workflow ID if available (for internal workflows),
 * falls back to IP address
 */
export function getRateLimitIdentifier(
  workflowId: string | null | undefined,
  ipAddress: string
): string {
  if (workflowId) {
    return `workflow:${workflowId}`
  }
  return `ip:${ipAddress}`
}
