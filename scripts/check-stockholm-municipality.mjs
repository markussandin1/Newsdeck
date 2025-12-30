#!/usr/bin/env node
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

const { getPool } = await import('../lib/db-postgresql.ts')
const pool = getPool()

const result = await pool.query(`
  SELECT code, name, region_code, country_code
  FROM municipalities  
  WHERE code = '0180' OR name ILIKE '%stockholm%'
  ORDER BY code
`)

console.log('Stockholm municipalities in database:')
console.log('=' .repeat(80))
result.rows.forEach(row => {
  console.log('Code: ' + row.code)
  console.log('Name: ' + row.name)
  console.log('Region: ' + row.region_code)
  console.log()
})

await pool.end()
