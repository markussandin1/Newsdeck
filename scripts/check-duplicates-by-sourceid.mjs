#!/usr/bin/env node

/**
 * Check for duplicate news items with the same source_id
 *
 * Usage:
 *   node scripts/check-duplicates-by-sourceid.mjs [source_id]
 */

import { config } from 'dotenv'
import pg from 'pg'

const { Pool } = pg

// Load environment variables
config()

const sourceId = process.argv[2] || 'SE_STA_TRISSID_1_7551482'

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkDuplicates() {
  try {
    console.log(`\n🔍 Checking for duplicates with source_id: "${sourceId}"\n`)

    // Check news_items table
    const newsItemsResult = await pool.query(`
      SELECT
        db_id,
        source_id,
        title,
        created_in_db,
        timestamp
      FROM news_items
      WHERE source_id = $1
      ORDER BY created_in_db DESC
    `, [sourceId])

    console.log(`📊 Found ${newsItemsResult.rows.length} entries in news_items table:\n`)

    if (newsItemsResult.rows.length === 0) {
      console.log('   No items found with this source_id')
    } else {
      newsItemsResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. db_id: ${row.db_id}`)
        console.log(`      created_in_db: ${row.created_in_db}`)
        console.log(`      timestamp: ${row.timestamp}`)
        console.log(`      title: ${row.title.substring(0, 60)}...`)
        console.log()
      })

      // Check column_data references
      const columnDataResult = await pool.query(`
        SELECT
          cd.column_id,
          cd.news_item_db_id,
          cd.created_at,
          ni.source_id,
          ni.title
        FROM column_data cd
        JOIN news_items ni ON ni.db_id = cd.news_item_db_id
        WHERE ni.source_id = $1
        ORDER BY cd.column_id, cd.created_at DESC
      `, [sourceId])

      console.log(`📌 Found ${columnDataResult.rows.length} entries in column_data:\n`)

      if (columnDataResult.rows.length === 0) {
        console.log('   No column_data entries found')
      } else {
        const byColumn = {}
        columnDataResult.rows.forEach(row => {
          if (!byColumn[row.column_id]) {
            byColumn[row.column_id] = []
          }
          byColumn[row.column_id].push(row)
        })

        Object.entries(byColumn).forEach(([columnId, items]) => {
          console.log(`   Column: ${columnId}`)
          console.log(`   Duplicates: ${items.length} entries for same source_id`)
          items.forEach((item, i) => {
            console.log(`      ${i + 1}. news_item_db_id: ${item.news_item_db_id}`)
            console.log(`         created_at: ${item.created_at}`)
          })
          console.log()
        })
      }

      // Summary
      if (newsItemsResult.rows.length > 1) {
        console.log(`⚠️  PROBLEM DETECTED:`)
        console.log(`   - ${newsItemsResult.rows.length} entries in news_items with same source_id`)
        console.log(`   - ${columnDataResult.rows.length} entries in column_data`)
        console.log(`   - This means Workflows is sending the same event multiple times`)
        console.log(`   - OR we're not deduplicating properly on ingestion\n`)
      } else {
        console.log(`✅ No duplicates found in news_items`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkDuplicates()
