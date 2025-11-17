import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkDuplicates() {
  try {
    // Check for Bronstunneln entries
    const result = await pool.query(`
      SELECT
        db_id,
        source_id,
        title,
        timestamp,
        created_in_db,
        workflow_id
      FROM news_items
      WHERE title LIKE '%Bronstunneln%'
      ORDER BY created_in_db DESC
      LIMIT 10
    `)

    console.log('\n=== BRONSTUNNELN ENTRIES IN DATABASE ===\n')
    console.log(`Total found: ${result.rows.length}\n`)

    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}.`)
      console.log(`   db_id: ${row.db_id}`)
      console.log(`   source_id: ${row.source_id}`)
      console.log(`   title: ${row.title}`)
      console.log(`   timestamp: ${row.timestamp}`)
      console.log(`   created_in_db: ${row.created_in_db}`)
      console.log(`   workflow_id: ${row.workflow_id}`)
      console.log('---')
    })

    // Check for duplicates by source_id
    const duplicateCheck = await pool.query(`
      SELECT
        source_id,
        COUNT(*) as count
      FROM news_items
      WHERE source_id = 'SE_STA_TRISSID_1_23222679'
      GROUP BY source_id
    `)

    console.log('\n=== DUPLICATE CHECK FOR SE_STA_TRISSID_1_23222679 ===\n')
    if (duplicateCheck.rows.length > 0) {
      console.log(`Count: ${duplicateCheck.rows[0].count}`)

      if (duplicateCheck.rows[0].count > 1) {
        console.log('\n⚠️  DUPLICATE FOUND! Same source_id exists multiple times in database')
      } else {
        console.log('\n✓ No duplicate - only one entry in database')
      }
    } else {
      console.log('No entries found with this source_id')
    }

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkDuplicates()
