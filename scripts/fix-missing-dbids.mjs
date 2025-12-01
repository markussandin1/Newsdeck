/**
 * Fix Missing dbIds in column_data JSON
 *
 * This script ensures that all items in column_data have the correct dbId
 * populated from the news_item_db_id foreign key.
 *
 * This fixes a bug where items without dbId in their JSON data would be
 * silently skipped during re-ingestion, causing columns to lose items over time.
 */

import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function fixMissingDbIds() {
  const client = await pool.connect()

  try {
    console.log('\n================================================================================')
    console.log('FIXING MISSING dbIds IN column_data TABLE')
    console.log('================================================================================\n')

    // Check for items with missing or mismatched dbId
    const checkQuery = `
      SELECT
        column_id,
        news_item_db_id,
        data->>'dbId' as json_dbId
      FROM column_data
      WHERE data->>'dbId' IS NULL
         OR data->>'dbId' = ''
         OR data->>'dbId' != news_item_db_id::text
    `

    const checkResult = await client.query(checkQuery)

    console.log(`Found ${checkResult.rows.length} items with missing or incorrect dbId\n`)

    if (checkResult.rows.length === 0) {
      console.log('✅ All items already have correct dbId. Nothing to fix.\n')
      return
    }

    // Show sample of affected items
    console.log('Sample of affected items (first 5):')
    checkResult.rows.slice(0, 5).forEach((row, idx) => {
      console.log(`  ${idx + 1}. Column: ${row.column_id}`)
      console.log(`     Correct dbId (FK): ${row.news_item_db_id}`)
      console.log(`     JSON dbId: ${row.json_dbId || '(missing)'}`)
    })

    console.log('\nStarting fix...\n')

    await client.query('BEGIN')

    // Update all items to ensure dbId matches the foreign key
    const updateQuery = `
      UPDATE column_data
      SET data = jsonb_set(
        data::jsonb,
        '{dbId}',
        to_jsonb(news_item_db_id::text)
      )
      WHERE data->>'dbId' IS NULL
         OR data->>'dbId' = ''
         OR data->>'dbId' != news_item_db_id::text
    `

    const updateResult = await client.query(updateQuery)

    await client.query('COMMIT')

    console.log(`✅ Fixed ${updateResult.rowCount} items\n`)

    // Verify the fix
    const verifyResult = await client.query(checkQuery)

    if (verifyResult.rows.length === 0) {
      console.log('✅ Verification successful: All items now have correct dbId\n')
    } else {
      console.log(`⚠️  Warning: ${verifyResult.rows.length} items still have issues\n`)
    }

    console.log('================================================================================')
    console.log('FIX COMPLETE')
    console.log('================================================================================\n')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    client.release()
    await pool.end()
  }
}

fixMissingDbIds()
