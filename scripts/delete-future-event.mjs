#!/usr/bin/env node

import pg from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })

const { Pool } = pg

// The problematic event with future timestamp
const EVENT_ID = 'SE_STA_TRISSID_1_19007734'

async function deleteEvent() {
  // Check if we're using Cloud SQL Proxy
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env file')
    process.exit(1)
  }

  console.log('Connecting to database via Cloud SQL Proxy...\n')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  try {
    // First, show the event details
    console.log(`Looking for event: ${EVENT_ID}\n`)

    const checkResult = await pool.query(
      'SELECT source_id, timestamp, title, created_in_db FROM news_items WHERE source_id = $1',
      [EVENT_ID]
    )

    if (checkResult.rows.length === 0) {
      console.log('✅ Event not found - already deleted or never existed')
      return
    }

    const event = checkResult.rows[0]
    console.log('Event found:')
    console.log('  ID:', event.source_id)
    console.log('  Timestamp:', event.timestamp)
    console.log('  Title:', event.title)
    console.log('  Created:', event.created_in_db)
    console.log()

    // Delete the event
    console.log('Deleting event...')

    const deleteResult = await pool.query(
      'DELETE FROM news_items WHERE source_id = $1',
      [EVENT_ID]
    )

    if (deleteResult.rowCount && deleteResult.rowCount > 0) {
      console.log(`✅ Successfully deleted ${deleteResult.rowCount} event(s)`)
      console.log('\nNote: Associated column_data entries will be automatically removed')
      console.log('due to CASCADE DELETE constraint.')
    } else {
      console.log('⚠️  No events were deleted')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

deleteEvent()
