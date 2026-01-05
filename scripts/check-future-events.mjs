#!/usr/bin/env node

import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const { Pool } = pg

async function checkFutureEvents() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  try {
    console.log('Checking for events with future timestamps...\n')

    const result = await pool.query(`
      SELECT
        source_id,
        timestamp,
        title,
        created_in_db,
        extra->'trafficCamera'->>'status' as camera_status,
        extra->'trafficCamera' IS NOT NULL as has_camera
      FROM news_items
      WHERE
        timestamp > NOW()
        AND extra->'trafficCamera' IS NOT NULL
        AND COALESCE(extra->'trafficCamera'->>'status', 'pending') != 'failed'
      ORDER BY timestamp ASC
      LIMIT 10
    `)

    if (result.rows.length === 0) {
      console.log('✅ No future-dated events found in gallery!')
      console.log('\nGallery should now show the most recent events correctly.')
    } else {
      console.log(`⚠️  Found ${result.rows.length} event(s) with future timestamps:\n`)
      console.table(result.rows.map(row => ({
        ID: row.source_id,
        Timestamp: row.timestamp.toISOString(),
        Title: row.title.substring(0, 50),
        'Has Camera': row.has_camera ? '✅' : '❌',
        Status: row.camera_status || 'pending'
      })))
      console.log('\nThese events will appear first in the gallery until their timestamp arrives.')
    }

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

checkFutureEvents()
