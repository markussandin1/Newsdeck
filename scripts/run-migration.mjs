import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load .env.local first (takes precedence), then .env
dotenv.config({ path: '.env.local' })
dotenv.config()

const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('❌ Usage: node run-migration.mjs <migration-file>')
  console.error('   Example: node run-migration.mjs db/migrations/002_add_unique_source_id.sql')
  process.exit(1)
}

const migrationPath = path.join(__dirname, '..', migrationFile)

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`)
  process.exit(1)
}

const sql = fs.readFileSync(migrationPath, 'utf-8')

console.log(`\n🔄 Running migration: ${migrationFile}`)
console.log(`📁 File: ${migrationPath}`)
console.log(`🗄️  Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`)

const pool = new Pool({ connectionString: DATABASE_URL })

try {
  // Run the migration
  await pool.query(sql)

  console.log('✅ Migration completed successfully!\n')

  // Verify the index was created
  const result = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE indexname = 'idx_news_items_unique_source_id'
  `)

  if (result.rows.length > 0) {
    console.log('✅ Verified: Unique index created')
    console.log(`   ${result.rows[0].indexdef}\n`)
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message)
  console.error('\nFull error:', error)
  process.exit(1)
} finally {
  await pool.end()
}
