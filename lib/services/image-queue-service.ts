/**
 * Image Upload Queue Service
 *
 * Manages asynchronous image upload queue using PostgreSQL.
 * Jobs are processed by the background worker (image-upload-worker.ts).
 *
 * Queue Status Flow:
 *   pending → processing → completed
 *                       ↘ failed (after 3 retries)
 *                       ↗ (retry: back to pending)
 */

import db from '@/lib/db';

export interface ImageUploadJob {
  id: string;
  newsItemDbId: string;
  cameraUrl: string;
  retryCount: number;
}

const MAX_RETRIES = 3;

/**
 * Lägger till uppladdningsjobb i queue
 *
 * @param newsItemDbId - UUID för NewsItem
 * @param cameraUrl - URL till bilden från Trafikverket
 */
export async function queueImageUpload(
  newsItemDbId: string,
  cameraUrl: string
): Promise<void> {
  await db.query(
    `
    INSERT INTO image_upload_queue (news_item_db_id, camera_url)
    VALUES ($1, $2)
  `,
    [newsItemDbId, cameraUrl]
  );

  console.log(`📝 Queued image upload for NewsItem ${newsItemDbId}`);
}

/**
 * Hämtar nästa jobb från queue
 *
 * Använder SELECT FOR UPDATE SKIP LOCKED för att undvika race conditions
 * när flera workers körs samtidigt.
 *
 * @returns Nästa jobb eller null om queue är tom
 */
export async function getNextImageJob(): Promise<ImageUploadJob | null> {
  const result = await db.query(
    `
    UPDATE image_upload_queue
    SET status = 'processing', processed_at = NOW()
    WHERE id = (
      SELECT id FROM image_upload_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, news_item_db_id, camera_url, retry_count
  `
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    newsItemDbId: row.news_item_db_id,
    cameraUrl: row.camera_url,
    retryCount: row.retry_count
  };
}

/**
 * Markerar jobb som komplett
 *
 * @param jobId - UUID för jobbet
 */
export async function completeImageJob(jobId: string): Promise<void> {
  await db.query(
    `
    UPDATE image_upload_queue
    SET status = 'completed', processed_at = NOW()
    WHERE id = $1
  `,
    [jobId]
  );

  console.log(`✅ Completed image upload job ${jobId}`);
}

/**
 * Markerar jobb som failed med retry-logik
 *
 * Om retry_count < MAX_RETRIES: status blir 'pending' för att försöka igen
 * Om retry_count >= MAX_RETRIES: status blir 'failed' permanent
 *
 * @param jobId - UUID för jobbet
 * @param error - Felmeddelande
 */
export async function failImageJob(jobId: string, error: string): Promise<void> {
  const result = await db.query(
    `
    UPDATE image_upload_queue
    SET
      status = CASE
        WHEN retry_count < $2 THEN 'pending'
        ELSE 'failed'
      END,
      retry_count = retry_count + 1,
      error_message = $3,
      processed_at = NOW()
    WHERE id = $1
    RETURNING retry_count, status
  `,
    [jobId, MAX_RETRIES, error]
  );

  const row = result.rows[0];
  if (row.status === 'pending') {
    console.log(
      `⚠️ Image upload job ${jobId} failed (retry ${row.retry_count}/${MAX_RETRIES}): ${error}`
    );
  } else {
    console.error(
      `❌ Image upload job ${jobId} permanently failed after ${MAX_RETRIES} retries: ${error}`
    );
  }
}

/**
 * Hämtar statistik om queue
 *
 * Användbart för monitoring och debugging
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const result = await db.query(`
    SELECT
      status,
      COUNT(*) as count
    FROM image_upload_queue
    GROUP BY status
  `);

  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  for (const row of result.rows) {
    const status = row.status as keyof typeof stats;
    stats[status] = parseInt(row.count);
  }

  return stats;
}

/**
 * Rensar gamla completed/failed jobs från queue
 *
 * Håller databasen ren genom att ta bort jobb äldre än 7 dagar.
 * Pending och processing jobs behålls alltid.
 *
 * @returns Antal raderade jobs
 */
export async function cleanupOldJobs(): Promise<number> {
  const result = await db.query(`
    DELETE FROM image_upload_queue
    WHERE status IN ('completed', 'failed')
    AND processed_at < NOW() - INTERVAL '7 days'
  `);

  const deleted = result.rowCount || 0;

  if (deleted > 0) {
    console.log(`🧹 Cleaned up ${deleted} old image upload jobs`);
  }

  return deleted;
}
