/**
 * Image Cleanup Service
 *
 * Intelligently manages cleanup of traffic camera images from GCS.
 * Instead of using a simple time-based lifecycle rule, we delete images
 * when their associated NewsItem is no longer in any column.
 *
 * Cleanup Flow:
 *   1. Find NewsItems that don't exist in any column
 *   2. Mark their images for deletion
 *   3. Wait 7 days (grace period)
 *   4. Delete images from GCS and database
 *
 * This ensures images are available as long as events are visible,
 * even if an event persists for more than 30 days.
 */

import db from '@/lib/db';
import { deleteTrafficImage } from './storage-service';

/**
 * Markerar bilder för radering när NewsItem tas bort från alla kolumner
 *
 * Använder en LEFT JOIN för att hitta NewsItems som inte har några
 * referenser i column_data tabellen.
 *
 * @returns Antal bilder som markerades för radering
 */
export async function markOrphanedImagesForDeletion(): Promise<number> {
  const result = await db.query(`
    UPDATE traffic_images
    SET marked_for_deletion = true
    WHERE id IN (
      SELECT ti.id
      FROM traffic_images ti
      WHERE ti.marked_for_deletion = false
      AND NOT EXISTS (
        SELECT 1 FROM column_data cd
        WHERE cd.news_item_db_id = ti.news_item_db_id
      )
    )
    RETURNING id
  `);

  const count = result.rowCount || 0;

  if (count > 0) {
    console.log(`🗑️  Marked ${count} orphaned images for deletion`);
  }

  return count;
}

/**
 * Raderar bilder som varit markerade i mer än 7 dagar
 *
 * 7-dagars grace period ger tid att ångra sig om en händelse
 * av misstag togs bort från alla kolumner.
 *
 * @returns Antal bilder som raderades
 */
export async function deleteMarkedImages(): Promise<number> {
  // 1. Hitta bilder som varit markerade i mer än 7 dagar
  const result = await db.query(`
    SELECT id, gcs_path, news_item_db_id, created_at
    FROM traffic_images
    WHERE marked_for_deletion = true
    AND created_at < NOW() - INTERVAL '7 days'
    ORDER BY created_at ASC
    LIMIT 100
  `);

  let deletedCount = 0;
  let failedCount = 0;

  for (const row of result.rows) {
    try {
      // 2. Radera från GCS
      await deleteTrafficImage(row.gcs_path);

      // 3. Radera från database
      await db.query(`DELETE FROM traffic_images WHERE id = $1`, [row.id]);

      deletedCount++;
      console.log(`✅ Deleted image: ${row.gcs_path}`);
    } catch (error) {
      failedCount++;
      console.error(`❌ Failed to delete ${row.gcs_path}:`, error);
    }
  }

  if (deletedCount > 0) {
    console.log(`🧹 Successfully deleted ${deletedCount} images (${failedCount} failed)`);
  }

  return deletedCount;
}

/**
 * Hämtar statistik om bilder i systemet
 *
 * Användbart för monitoring och debugging
 */
export async function getImageStats(): Promise<{
  total: number;
  active: number;
  markedForDeletion: number;
  readyForDeletion: number;
}> {
  const result = await db.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE marked_for_deletion = false) as active,
      COUNT(*) FILTER (WHERE marked_for_deletion = true) as marked,
      COUNT(*) FILTER (
        WHERE marked_for_deletion = true
        AND created_at < NOW() - INTERVAL '7 days'
      ) as ready_for_deletion
    FROM traffic_images
  `);

  const row = result.rows[0];

  return {
    total: parseInt(row.total) || 0,
    active: parseInt(row.active) || 0,
    markedForDeletion: parseInt(row.marked) || 0,
    readyForDeletion: parseInt(row.ready_for_deletion) || 0
  };
}

/**
 * Daglig cleanup-jobb (körs via Cloud Scheduler)
 *
 * Kombinerar båda stegen:
 *   1. Markera orphaned bilder
 *   2. Radera gamla markerade bilder
 */
export async function runDailyCleanup(): Promise<void> {
  console.log('🧹 Starting daily image cleanup...');

  try {
    // Hämta stats innan
    const statsBefore = await getImageStats();
    console.log(`📊 Before cleanup: ${statsBefore.total} total, ${statsBefore.active} active, ${statsBefore.markedForDeletion} marked`);

    // Steg 1: Markera orphaned bilder
    const marked = await markOrphanedImagesForDeletion();

    // Steg 2: Radera gamla markerade bilder
    const deleted = await deleteMarkedImages();

    // Hämta stats efter
    const statsAfter = await getImageStats();
    console.log(`📊 After cleanup: ${statsAfter.total} total, ${statsAfter.active} active, ${statsAfter.markedForDeletion} marked`);

    console.log(`✅ Daily cleanup completed: marked ${marked}, deleted ${deleted}`);
  } catch (error) {
    console.error('❌ Daily cleanup failed:', error);
    throw error;
  }
}
