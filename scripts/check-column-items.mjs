import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkColumnItems() {
  const columnId = 'a4538ba8-b981-4f31-ae68-d8400491cf9b'

  try {
    // Get column info
    const columnInfo = await pool.query(`
      SELECT id, name, dashboard_id
      FROM columns
      WHERE id = $1
    `, [columnId])

    console.log('\n=== COLUMN INFORMATION ===\n')
    if (columnInfo.rows.length > 0) {
      console.log(`Name: ${columnInfo.rows[0].name}`)
      console.log(`ID: ${columnInfo.rows[0].id}`)
      console.log(`Dashboard ID: ${columnInfo.rows[0].dashboard_id}`)
    } else {
      console.log('Column not found!')
      return
    }

    // Count total news items for this column
    const totalCount = await pool.query(`
      SELECT COUNT(*) as total
      FROM news_items
      WHERE column_id = $1
    `, [columnId])

    console.log(`\nTotal news items in database: ${totalCount.rows[0].total}`)

    // Get recent items
    const recentItems = await pool.query(`
      SELECT
        db_id,
        source_id,
        title,
        timestamp,
        created_in_db,
        news_value
      FROM news_items
      WHERE column_id = $1
      ORDER BY timestamp DESC
      LIMIT 10
    `, [columnId])

    console.log('\n=== MOST RECENT 10 ITEMS ===\n')
    recentItems.rows.forEach((row, idx) => {
      console.log(`${idx + 1}.`)
      console.log(`   Title: ${row.title}`)
      console.log(`   Source ID: ${row.source_id}`)
      console.log(`   Timestamp: ${row.timestamp}`)
      console.log(`   Created in DB: ${row.created_in_db}`)
      console.log(`   News Value: ${row.news_value}`)
      console.log('---')
    })

    // Check column_data (the column configuration)
    const columnData = await pool.query(`
      SELECT column_data
      FROM columns
      WHERE id = $1
    `, [columnId])

    if (columnData.rows.length > 0 && columnData.rows[0].column_data) {
      const data = columnData.rows[0].column_data
      console.log(`\n=== COLUMN_DATA ARRAY LENGTH ===`)
      console.log(`Items in column_data array: ${data.length}`)

      console.log('\n=== FIRST 10 ITEMS IN COLUMN_DATA ===\n')
      const first10 = data.slice(0, 10)
      first10.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.title} (ID: ${item.id})`)
      })
    }

  } catch (error) {
    console.error('Error:', error.message)
    console.error(error)
  } finally {
    await pool.end()
  }
}

checkColumnItems()
