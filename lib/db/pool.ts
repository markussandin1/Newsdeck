/**
 * PostgreSQL connection pool för Newsdeck (P2-1 steg 1).
 *
 * Singleton-pool som återanvänds av hela appen (db-postgresql.ts,
 * rate-limit.ts m.fl.). Hanterar både TCP-anslutningar (lokal dev mot
 * Cloud SQL Proxy) och Unix-socket (prod på Cloud Run).
 */
import { Pool } from 'pg'
import { parse as parseConnectionString } from 'pg-connection-string'
import { logger } from '../logger'

let pool: Pool | null = null

export function getPool(): Pool {
  if (pool) return pool

  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set!\n' +
      '\n' +
      'For local development:\n' +
      '  1. Start Cloud SQL Proxy: npm run proxy:start\n' +
      '  2. Ensure .env.local has DATABASE_URL set\n' +
      '  3. Or use: npm run dev:full (auto-starts proxy)\n' +
      '\n' +
      'For production:\n' +
      '  Set DATABASE_URL in your environment variables\n'
    )
  }

  // Parse DATABASE_URL — hanterar både TCP och Cloud SQL Unix socket
  // (format: postgresql://user:pass@/cloudsql/instance/dbname).
  let config: {
    user?: string | null
    password?: string | null
    host?: string | null
    database?: string | null
    port?: string | number | null
  }

  if (DATABASE_URL.includes('@/cloudsql/')) {
    const match = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@(\/cloudsql\/[^/]+)\/(.+)/)
    if (match) {
      config = {
        user: match[1],
        password: match[2],
        host: match[3],
        database: match[4],
      }
    } else {
      config = parseConnectionString(DATABASE_URL)
    }
  } else {
    config = parseConnectionString(DATABASE_URL)
  }

  const poolConfig: {
    user?: string
    password?: string
    database?: string
    host?: string
    port?: number
    ssl?: boolean | { rejectUnauthorized: boolean }
    max: number
    idleTimeoutMillis: number
    connectionTimeoutMillis: number
  } = {
    user: config.user ?? undefined,
    password: config.password ?? undefined,
    database: config.database ?? undefined,
    host: config.host ?? undefined,
    port: config.port ? parseInt(config.port.toString()) : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  }

  // SSL bara för TCP — Unix-socket går genom kernel och behöver inget.
  if (!config.host || !config.host.startsWith('/cloudsql/')) {
    poolConfig.ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }

  pool = new Pool(poolConfig)

  pool.on('error', (err) => {
    if (
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ECONNRESET') ||
      err.message.includes('Connection refused')
    ) {
      logger.error('db.pool.connectionError', {
        error: 'Cloud SQL Proxy connection issue',
        solution: 'Run: npm run proxy:restart',
        details: err.message,
      })
    } else {
      logger.error('db.pool.unexpectedError', { error: err.message })
    }
  })

  return pool
}
