import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const pool = new Pool({
  user: 'newsdeck-user',
  password: 'bt7M1kQvgxokVayDWheKIAs4ZDZnrNefz9+Ond7jAzY=',
  host: 'localhost',
  port: 5432,
  database: 'newsdeck',
  ssl: false
})

const sql = readFileSync(join(__dirname, '../db/migrations/008_remove_country_code_fk.sql'), 'utf8')

try {
  const client = await pool.connect()
  console.log('Connected!')
  const result = await client.query(sql)
  console.log('Migration completed:', result.command)
  client.release()
} catch (err) {
  console.error('Migration failed:', err.message)
} finally {
  await pool.end()
}
