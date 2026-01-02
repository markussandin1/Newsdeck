import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db-postgresql';

/**
 * Sync traffic camera data from news_items to column_data
 *
 * Fixes items processed before the column_data sync fix.
 * Run once after deploying the worker fix.
 */
export async function POST() {
  const pool = getPool();

  try {
    console.log('🔄 Starting traffic camera data sync...');

    // Find all items with trafficCamera status='ready' in news_items
    const findResult = await pool.query(`
      SELECT
        ni.db_id,
        ni.extra->'trafficCamera' as traffic_camera,
        COUNT(cd.id) as column_count
      FROM news_items ni
      LEFT JOIN column_data cd ON cd.news_item_db_id = ni.db_id
      WHERE ni.extra->'trafficCamera' IS NOT NULL
        AND ni.extra->'trafficCamera'->>'status' = 'ready'
      GROUP BY ni.db_id, ni.extra->'trafficCamera'
      HAVING COUNT(cd.id) > 0
    `);

    console.log(`📊 Found ${findResult.rows.length} items to sync`);

    let syncedCount = 0;
    let totalRowsUpdated = 0;

    // Update each item
    for (const row of findResult.rows) {
      const updateResult = await pool.query(`
        UPDATE column_data
        SET data = jsonb_set(
          data,
          '{trafficCamera}',
          $1::jsonb
        )
        WHERE news_item_db_id = $2
      `, [row.traffic_camera, row.db_id]);

      if (updateResult.rowCount && updateResult.rowCount > 0) {
        syncedCount++;
        totalRowsUpdated += updateResult.rowCount;
      }
    }

    console.log(`✅ Synced ${syncedCount} items (${totalRowsUpdated} column_data rows updated)`);

    return NextResponse.json({
      success: true,
      itemsSynced: syncedCount,
      rowsUpdated: totalRowsUpdated,
      message: `Successfully synced ${syncedCount} news items across ${totalRowsUpdated} column_data rows`
    });

  } catch (error) {
    console.error('❌ Sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
