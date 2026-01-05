#!/usr/bin/env node

import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const { Pool } = pg

async function deleteAllFutureEvents() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  try {
    console.log('🔍 Finding all future events with traffic cameras...\n')

    // First, show what we're going to delete
    const checkResult = await pool.query(`
      SELECT
        source_id,
        timestamp,
        title,
        extra->'trafficCamera'->>'status' as camera_status
      FROM news_items
      WHERE
        timestamp > NOW()
        AND extra->'trafficCamera' IS NOT NULL
        AND COALESCE(extra->'trafficCamera'->>'status', 'pending') != 'failed'
      ORDER BY timestamp ASC
    `)

    if (checkResult.rows.length === 0) {
      console.log('✅ No future events found - gallery is already clean!')
      return
    }

    console.log(`Found ${checkResult.rows.length} future event(s) to delete:\n`)
    console.table(checkResult.rows.map((row, idx) => ({
      '#': idx + 1,
      'Timestamp': row.timestamp.toISOString().split('T')[0] + ' ' + row.timestamp.toISOString().split('T')[1].split('.')[0],
      'Title': row.title.substring(0, 60),
      'Status': row.camera_status || 'pending'
    })))

    console.log('\n🗑️  Deleting all future events...')

    const deleteResult = await pool.query(`
      DELETE FROM news_items
      WHERE
        timestamp > NOW()
        AND extra->'trafficCamera' IS NOT NULL
        AND COALESCE(extra->'trafficCamera'->>'status', 'pending') != 'failed'
    `)

    console.log(`\n✅ Successfully deleted ${deleteResult.rowCount} event(s)`)
    console.log('\nNote: Associated column_data entries were automatically removed')
    console.log('due to CASCADE DELETE constraint.')
    console.log('\n📸 Gallery should now show only actual traffic events!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

deleteAllFutureEvents()
