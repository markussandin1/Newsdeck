import { persistentDb } from '../lib/db-postgresql'

async function checkDuplicates() {
  try {
    console.log('\n=== Checking for Bronstunneln duplicates ===\n')

    // Get all news items
    const allItems = await persistentDb.getNewsItems()

    // Filter Bronstunneln entries
    const bronstunnelItems = allItems.filter(item =>
      item.title && item.title.includes('Bronstunneln')
    )

    console.log(`Total Bronstunneln entries: ${bronstunnelItems.length}\n`)

    // Display all Bronstunneln entries
    bronstunnelItems.forEach((item, idx) => {
      console.log(`${idx + 1}.`)
      console.log(`   dbId: ${item.dbId}`)
      console.log(`   source_id: ${item.id}`)
      console.log(`   title: ${item.title}`)
      console.log(`   timestamp: ${item.timestamp}`)
      console.log(`   created_in_db: ${item.createdInDb}`)
      console.log(`   workflow_id: ${item.workflowId}`)
      console.log('---\n')
    })

    // Check for duplicates by source_id
    const bySourceId = new Map<string, number>()
    bronstunnelItems.forEach(item => {
      const sourceId = item.id || 'no-id'
      bySourceId.set(sourceId, (bySourceId.get(sourceId) || 0) + 1)
    })

    console.log('\n=== Duplicate Analysis ===\n')
    bySourceId.forEach((count, sourceId) => {
      if (count > 1) {
        console.log(`⚠️  source_id "${sourceId}" appears ${count} times`)
      }
    })

    // Check specific ID
    const specificId = 'SE_STA_TRISSID_1_23222679'
    const specificItems = bronstunnelItems.filter(item => item.id === specificId)
    console.log(`\n=== Checking specific ID: ${specificId} ===`)
    console.log(`Found ${specificItems.length} entries`)

    if (specificItems.length > 1) {
      console.log('\n⚠️  DUPLICATE FOUND! Details:')
      specificItems.forEach((item, idx) => {
        console.log(`\nEntry ${idx + 1}:`)
        console.log(`  dbId: ${item.dbId}`)
        console.log(`  created_in_db: ${item.createdInDb}`)
        console.log(`  timestamp: ${item.timestamp}`)
      })
    } else {
      console.log('✓ No duplicate in database for this source_id')
    }

  } catch (error) {
    console.error('Error:', error)
  }

  process.exit(0)
}

checkDuplicates()
