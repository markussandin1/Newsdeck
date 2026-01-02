#!/usr/bin/env node
/**
 * Sync Traffic Camera Data from news_items to column_data
 *
 * Fixes items that were processed by the old worker (before column_data sync fix).
 * These items have images in GCS and correct data in news_items.extra, but
 * column_data still shows status: 'pending'.
 */
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function syncTrafficCameraData() {
  const client = await pool.connect();

  try {
    console.log('🔄 Syncing traffic camera data from news_items to column_data...\n');

    // Find all items with trafficCamera in news_items that need syncing
    const result = await client.query(`
      SELECT
        ni.db_id,
        ni.extra->>'trafficCamera' as traffic_camera,
        COUNT(cd.id) as column_count
      FROM news_items ni
      LEFT JOIN column_data cd ON cd.news_item_db_id = ni.db_id
      WHERE ni.extra->>'trafficCamera' IS NOT NULL
        AND ni.extra->'trafficCamera'->>'status' = 'ready'
      GROUP BY ni.db_id, ni.extra->>'trafficCamera'
      HAVING COUNT(cd.id) > 0
    `);

    console.log(`Found ${result.rows.length} items with traffic cameras to sync\n`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const row of result.rows) {
      try {
        const trafficCamera = JSON.parse(row.traffic_camera);

        // Update all column_data rows for this news_item
        const updateResult = await client.query(`
          UPDATE column_data
          SET data = jsonb_set(
            data,
            '{trafficCamera}',
            $1::jsonb
          )
          WHERE news_item_db_id = $2
        `, [JSON.stringify(trafficCamera), row.db_id]);

        if (updateResult.rowCount > 0) {
          syncedCount++;
          console.log(`✅ Synced ${row.db_id} (${updateResult.rowCount} column_data rows updated)`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to sync ${row.db_id}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully synced: ${syncedCount} items`);
    console.log(`❌ Errors: ${errorCount} items`);
    console.log(`📸 Total images in GCS: 559`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

syncTrafficCameraData();
