import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { parse as parseConnectionString } from 'pg-connection-string'
import { logger } from '@/lib/logger'

export async function POST() {
  const DATABASE_URL = process.env.DATABASE_URL

  if (!DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: 'DATABASE_URL not configured' },
      { status: 500 }
    )
  }

  try {
    let config: {
      user?: string | null
      password?: string | null
      host?: string | null
      database?: string | null
      port?: string | number | null
    }

    // Check if it's a Unix socket connection (starts with @/cloudsql/)
    if (DATABASE_URL.includes('@/cloudsql/')) {
      const match = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@(\/cloudsql\/[^\/]+)\/(.+)/)
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
    } = {
      user: config.user ?? undefined,
      password: config.password ?? undefined,
      database: config.database ?? undefined,
      host: config.host ?? undefined,
      port: config.port ? parseInt(config.port.toString()) : undefined,
    }

    // Only add SSL for non-Unix socket connections
    if (!config.host || !config.host.startsWith('/cloudsql/')) {
      poolConfig.ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }

    const pool = new Pool(poolConfig)

    // Migration SQL
    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS api_request_logs (
        id SERIAL PRIMARY KEY,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        success BOOLEAN NOT NULL,
        request_body JSONB,
        response_body JSONB,
        error_message TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_request_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_api_logs_success ON api_request_logs(success);
      CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_request_logs(endpoint);
    `

    await pool.query(migrationSQL)
    await pool.end()

    logger.info('admin.migrate-logs.success')

    return NextResponse.json({
      success: true,
      message: 'API logs migration completed successfully'
    })
  } catch (error) {
    logger.error('admin.migrate-logs.error', { error })
    return NextResponse.json(
      { success: false, error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
