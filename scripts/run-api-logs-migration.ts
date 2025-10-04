import { Pool } from 'pg'
import { parse as parseConnectionString } from 'pg-connection-string'
import * as fs from 'fs'
import * as path from 'path'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

async function runMigration() {
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

  try {
    console.log('🔄 Running API logs migration...')

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '004-add-api-request-logs.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Execute migration
    await pool.query(migrationSQL)

    console.log('✅ Migration completed successfully!')
    console.log('📊 API request logs table created')

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
