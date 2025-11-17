import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkAllDuplicates() {
  try {
    // Check for any source_ids that appear more than once
    const duplicateCheck = await pool.query(`
      SELECT
        source_id,
        COUNT(*) as count,
        array_agg(db_id ORDER BY created_in_db DESC) as db_ids,
        array_agg(title ORDER BY created_in_db DESC) as titles,
        array_agg(created_in_db ORDER BY created_in_db DESC) as timestamps
      FROM news_items
      WHERE source_id IS NOT NULL
      GROUP BY source_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `)

    console.log('\n=== DUPLICATE SOURCE_IDS IN DATABASE ===\n')

    if (duplicateCheck.rows.length === 0) {
      console.log('✓ No duplicates found! All source_ids are unique.\n')
    } else {
      console.log(`⚠️  Found ${duplicateCheck.rows.length} source_ids with duplicates:\n`)

      duplicateCheck.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. source_id: ${row.source_id}`)
        console.log(`   Duplicate count: ${row.count}`)
        console.log(`   Titles:`)
        row.titles.forEach((title, i) => {
          const keepStatus = i === 0 ? '✓ KEEP' : '✗ DELETE'
          console.log(`     ${keepStatus} - ${title.substring(0, 60)}...`)
        })
        console.log(`   Timestamps: ${row.timestamps.map(t => new Date(t).toISOString()).join(', ')}`)
        console.log('---')
      })

      // Calculate total items to be deleted
      const totalToDelete = duplicateCheck.rows.reduce((sum, row) => sum + (row.count - 1), 0)
      console.log(`\n📊 Summary:`)
      console.log(`   Duplicate source_ids: ${duplicateCheck.rows.length}`)
      console.log(`   Total news items to be deleted: ${totalToDelete}`)
      console.log(`   (Keeping the most recent entry for each source_id)\n`)
    }

    // Get total count of news items
    const totalCount = await pool.query('SELECT COUNT(*) FROM news_items')
    console.log(`\n📈 Total news items in database: ${totalCount.rows[0].count}\n`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkAllDuplicates()
