#!/usr/bin/env node

/**
 * Restore column_data by matching news_items to columns based on workflow_id
 */

const { Client } = require('pg')
const path = require('path')
const fs = require('fs')

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
}

loadEnv()

async function restoreColumnData() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'newsdeck',
    user: 'newsdeck-user',
    password: 'bt7M1kQvgxokVayDWheKIAs4ZDZnrNefz9+Ond7jAzY='
  })

  try {
    await client.connect()
    console.log('✓ Connected to database\n')

    // 1. Get all dashboards with their columns
    const dashboards = await client.query('SELECT id, name, columns FROM dashboards')
    console.log(`📊 Found ${dashboards.rows.length} dashboards`)

    let totalRestored = 0

    for (const dashboard of dashboards.rows) {
      const columns = dashboard.columns || []
      console.log(`\n🔍 Processing dashboard: ${dashboard.name} (${columns.length} columns)`)

      for (const column of columns) {
        if (column.isArchived) {
          console.log(`  ⏭️  Skipping archived column: ${column.title}`)
          continue
        }

        // Match by flowId (new system) or column.id (old system where column.id = workflow_id)
        const workflowId = column.flowId || column.id

        console.log(`  📋 Restoring column: ${column.title}`)
        console.log(`     Workflow ID: ${workflowId}`)

        // Find matching news items
        const newsItems = await client.query(
          'SELECT * FROM news_items WHERE workflow_id = $1 ORDER BY created_in_db DESC LIMIT 100',
          [workflowId]
        )

        if (newsItems.rows.length === 0) {
          console.log(`     ⚠️  No news items found for this workflow`)
          continue
        }

        console.log(`     ✅ Found ${newsItems.rows.length} news items`)

        // Insert into column_data
        let inserted = 0
        for (const item of newsItems.rows) {
          try {
            await client.query(
              `INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (column_id, news_item_db_id) DO NOTHING`,
              [
                column.id,
                item.db_id,
                JSON.stringify({
                  dbId: item.db_id,
                  id: item.source_id,
                  workflowId: item.workflow_id,
                  source: item.source,
                  timestamp: item.timestamp,
                  title: item.title,
                  description: item.description,
                  newsValue: item.news_value,
                  category: item.category,
                  severity: item.severity,
                  location: item.location,
                  extra: item.extra,
                  raw: item.raw,
                  createdInDb: item.created_in_db
                }),
                item.created_in_db
              ]
            )
            inserted++
          } catch (e) {
            console.error(`     ❌ Failed to insert item ${item.db_id}:`, e.message)
          }
        }

        console.log(`     💾 Inserted ${inserted} items into column_data`)
        totalRestored += inserted
      }
    }

    console.log(`\n✅ Restore complete! Total items restored: ${totalRestored}`)

  } catch (error) {
    console.error('❌ Restore failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

restoreColumnData()
