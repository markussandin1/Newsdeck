import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function diagnoseColumn(columnId) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`DIAGNOSING COLUMN: ${columnId}`)
  console.log('='.repeat(80))

  try {
    // 1. Check column info
    console.log('\n[1] Column Information:')
    const columnInfo = await pool.query(`
      SELECT d.id as dashboard_id, d.name as dashboard_name, d.columns
      FROM dashboards d
      WHERE d.columns::text LIKE $1
    `, [`%${columnId}%`])

    if (columnInfo.rows.length > 0) {
      const dashboard = columnInfo.rows[0]
      const columns = typeof dashboard.columns === 'string'
        ? JSON.parse(dashboard.columns)
        : dashboard.columns
      const column = columns.find(c => c.id === columnId)

      if (column) {
        console.log(`   Dashboard: ${dashboard.dashboard_name}`)
        console.log(`   Column Title: ${column.title}`)
        console.log(`   Flow ID: ${column.flowId || 'None'}`)
      } else {
        console.log(`   ❌ Column ${columnId} not found in columns array`)
      }
    } else {
      console.log(`   ❌ Column ${columnId} not found in any dashboard`)
    }

    // 2. Check news_items table (total items for this workflow)
    console.log('\n[2] News Items Table (source of truth):')
    const newsItemsCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM news_items
      WHERE workflow_id = $1 OR db_id IN (
        SELECT news_item_db_id FROM column_data WHERE column_id = $1
      )
    `, [columnId])
    console.log(`   Total items in news_items: ${newsItemsCount.rows[0].count}`)

    // 3. Check column_data table (cached column data)
    console.log('\n[3] Column Data Table (cache):')
    const columnDataCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM column_data
      WHERE column_id = $1
    `, [columnId])
    console.log(`   Total items in column_data: ${columnDataCount.rows[0].count}`)

    // 4. Get sample items from column_data
    console.log('\n[4] Sample Items from column_data (first 10):')
    const sampleItems = await pool.query(`
      SELECT
        cd.news_item_db_id,
        cd.data->>'title' as title,
        cd.data->>'dbId' as json_dbId,
        cd.created_at,
        ni.title as ni_title
      FROM column_data cd
      LEFT JOIN news_items ni ON cd.news_item_db_id = ni.db_id
      WHERE cd.column_id = $1
      ORDER BY cd.created_at DESC
      LIMIT 10
    `, [columnId])

    sampleItems.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.title}`)
      console.log(`      DB ID: ${row.news_item_db_id}`)
      console.log(`      JSON dbId: ${row.json_dbId}`)
      console.log(`      Matches news_items: ${row.ni_title ? '✅' : '❌'}`)
      console.log(`      Created: ${row.created_at}`)
    })

    // 5. Check for orphaned data (items in column_data without matching news_items)
    console.log('\n[5] Data Integrity Check:')
    const orphanedCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM column_data cd
      LEFT JOIN news_items ni ON cd.news_item_db_id = ni.db_id
      WHERE cd.column_id = $1 AND ni.db_id IS NULL
    `, [columnId])

    if (orphanedCheck.rows[0].count > 0) {
      console.log(`   ⚠️  Found ${orphanedCheck.rows[0].count} orphaned entries (column_data without matching news_items)`)
    } else {
      console.log(`   ✅ All column_data entries have matching news_items`)
    }

    // 6. Check for missing dbId in JSON
    console.log('\n[6] JSON Data Quality Check:')
    const missingDbId = await pool.query(`
      SELECT COUNT(*) as count
      FROM column_data
      WHERE column_id = $1 AND (data->>'dbId' IS NULL OR data->>'dbId' = '')
    `, [columnId])

    if (missingDbId.rows[0].count > 0) {
      console.log(`   ⚠️  Found ${missingDbId.rows[0].count} items missing dbId in JSON data`)
      console.log(`   This will cause items to be skipped during re-ingestion!`)
    } else {
      console.log(`   ✅ All items have dbId in JSON data`)
    }

    // 7. Recent ingestion activity
    console.log('\n[7] Recent Activity:')
    const recentActivity = await pool.query(`
      SELECT
        COUNT(*) as count,
        MAX(created_at) as last_update
      FROM column_data
      WHERE column_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
    `, [columnId])

    console.log(`   Items added in last hour: ${recentActivity.rows[0].count}`)
    console.log(`   Last update: ${recentActivity.rows[0].last_update || 'None'}`)

    console.log('\n' + '='.repeat(80))
    console.log('DIAGNOSIS COMPLETE')
    console.log('='.repeat(80))

    // Recommendations
    console.log('\n📋 Recommendations:')
    if (orphanedCheck.rows[0].count > 0) {
      console.log('   ⚠️  Clean up orphaned column_data entries')
    }
    if (missingDbId.rows[0].count > 0) {
      console.log('   ⚠️  Fix missing dbId in column_data JSON (this is likely the root cause)')
    }
    if (columnDataCount.rows[0].count < newsItemsCount.rows[0].count) {
      console.log('   ℹ️  column_data has fewer items than available - consider resyncing')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await pool.end()
  }
}

const columnId = process.argv[2] || 'a4538ba8-b981-4f31-ae68-d8400491cf9b'
diagnoseColumn(columnId)
