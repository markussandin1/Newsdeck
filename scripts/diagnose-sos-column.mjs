import pg from 'pg'

const { Pool } = pg
const COLUMN_ID = 'a4538ba8-b981-4f31-ae68-d8400491cf9b'
const WORKFLOW_ID = '3db0f8f9-2682-420e-bc97-5c385cd8679d'

const pool = new Pool({
  user: 'newsdeck-user',
  password: 'bt7M1kQvgxokVayDWheKIAs4ZDZnrNefz9+Ond7jAzY=',
  host: 'localhost',
  port: 5432,
  database: 'newsdeck',
  ssl: false
})

try {
  const client = await pool.connect()

  // 1. Kolla om kolumnen finns och vad dess flowId är
  const dashboards = await client.query(`SELECT id, name, columns FROM dashboards`)
  console.log('\n=== Kolumner med matchande workflowId ===')
  let targetColumn = null
  for (const row of dashboards.rows) {
    const cols = row.columns || []
    for (const col of cols) {
      if (col.flowId === WORKFLOW_ID) {
        console.log(`  Match: column "${col.title}" (${col.id}) i dashboard "${row.name}"`)
      }
      if (col.id === COLUMN_ID) {
        targetColumn = col
      }
    }
  }

  if (targetColumn) {
    console.log(`\n=== Kolumn ${COLUMN_ID} ===`)
    console.log(`  Titel: ${targetColumn.title}`)
    console.log(`  flowId: ${targetColumn.flowId || '(ej satt)'}`)
    console.log(`  flowId matchar workflowId: ${targetColumn.flowId === WORKFLOW_ID}`)
  } else {
    console.log(`\n⚠️  Kolumn ${COLUMN_ID} hittades inte i någon dashboard`)
  }

  // 2. Kolla senaste news_items med source=SOS Alarm
  const recent = await client.query(`
    SELECT db_id, source_id, title, timestamp, workflow_id, created_in_db
    FROM news_items
    WHERE source ILIKE '%SOS%' OR title ILIKE '%trafikolycka%'
    ORDER BY created_in_db DESC
    LIMIT 10
  `)
  console.log(`\n=== Senaste SOS/trafikolycka-items i news_items ===`)
  for (const r of recent.rows) {
    console.log(`  [${r.created_in_db?.toISOString?.() || r.created_in_db}] "${r.title}" (source_id=${r.source_id}, workflow_id=${r.workflow_id})`)
  }

  // 3. Kolla column_data för kolumnen
  const colData = await client.query(`
    SELECT COUNT(*) as count FROM column_data WHERE column_id = $1
  `, [COLUMN_ID])
  console.log(`\n=== column_data för ${COLUMN_ID} ===`)
  console.log(`  Antal items: ${colData.rows[0].count}`)

  const latestInCol = await client.query(`
    SELECT cd.created_at, ni.title, ni.source_id, ni.workflow_id
    FROM column_data cd
    JOIN news_items ni ON ni.db_id = cd.news_item_db_id
    WHERE cd.column_id = $1
    ORDER BY cd.created_at DESC
    LIMIT 5
  `, [COLUMN_ID])
  if (latestInCol.rows.length > 0) {
    console.log(`  Senaste items i kolumnen:`)
    for (const r of latestInCol.rows) {
      console.log(`    [${r.created_at?.toISOString?.() || r.created_at}] "${r.title}" (source_id=${r.source_id})`)
    }
  } else {
    console.log(`  (inga items)`)
  }

  client.release()
} catch (err) {
  console.error('Fel:', err.message)
} finally {
  await pool.end()
}
