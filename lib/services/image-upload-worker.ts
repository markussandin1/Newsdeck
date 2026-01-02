/**
 * Image Upload Worker
 *
 * Background process that continuously monitors the upload queue and processes jobs.
 * Started automatically on server startup via instrumentation.ts.
 *
 * Process Flow:
 *   1. Poll queue for next pending job
 *   2. Fetch image from Trafikverket
 *   3. Upload to GCS
 *   4. Save to traffic_images table
 *   5. Update NewsItem extra field with GCS URL
 *   6. Mark job as completed
 *
 * If error occurs: Retry up to 3 times, then mark as failed
 */

import {
  getNextImageJob,
  completeImageJob,
  failImageJob,
  getQueueStats,
  cleanupOldJobs
} from './image-queue-service';
import { uploadTrafficImage } from './storage-service';
import { getPool } from '@/lib/db-postgresql';

const MAX_HISTORY = 10;
const POLL_INTERVAL = 5000; // 5 seconds when queue is empty
const ERROR_BACKOFF = 10000; // 10 seconds after worker error
const CLEANUP_INTERVAL = 3600000; // 1 hour

let isRunning = false;
let lastCleanup = Date.now();

/**
 * Processar ett uppladdningsjobb
 *
 * @returns true om ett jobb processades, false om queue var tom
 */
async function processImageJob(): Promise<boolean> {
  const job = await getNextImageJob();
  if (!job) {
    return false;
  }

  const db = getPool();
  console.log(`🔄 Processing image upload job ${job.id} for NewsItem ${job.newsItemDbId}`);

  try {
    // 1. Hämta bild från Trafikverket
    const response = await fetch(job.cameraUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Validera att det faktiskt är en bild
    if (buffer.length === 0) {
      throw new Error('Empty image buffer');
    }

    if (buffer.length < 100) {
      throw new Error('Image too small, likely corrupt');
    }

    const timestamp = new Date().toISOString();

    // 2. Ladda upp till GCS
    const gcsUrl = await uploadTrafficImage(buffer, job.newsItemDbId, timestamp);

    // 3. Spara till traffic_images tabell
    await db.query(
      `
      INSERT INTO traffic_images (news_item_db_id, gcs_path, captured_at)
      VALUES ($1, $2, $3)
    `,
      [job.newsItemDbId, gcsUrl, timestamp]
    );

    // 4. Uppdatera NewsItem extra-fält
    const result = await db.query(
      `
      SELECT extra FROM news_items WHERE db_id = $1
    `,
      [job.newsItemDbId]
    );

    if (result.rows.length === 0) {
      throw new Error(`NewsItem ${job.newsItemDbId} not found`);
    }

    const extra = result.rows[0]?.extra || {};
    const trafficCamera = extra.trafficCamera || {};

    // Lägg till i history (behåll max 10 senaste)
    const history = trafficCamera.history || [];
    history.push({ url: gcsUrl, timestamp });
    const cappedHistory = history.slice(-MAX_HISTORY);

    // Uppdatera med ny data
    const updatedExtra = {
      ...extra,
      trafficCamera: {
        ...trafficCamera,
        status: 'ready',
        currentUrl: gcsUrl,
        currentTimestamp: timestamp,
        history: cappedHistory
      }
    };

    await db.query(
      `
      UPDATE news_items
      SET extra = $1
      WHERE db_id = $2
    `,
      [updatedExtra, job.newsItemDbId]
    );

    // 5. Markera jobb som klart
    await completeImageJob(job.id);

    console.log(
      `✅ Successfully uploaded image for NewsItem ${job.newsItemDbId} (${buffer.length} bytes)`
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Image upload failed for job ${job.id}:`, errorMessage);

    // Markera som failed (med retry-logik)
    await failImageJob(job.id, errorMessage);

    // Uppdatera NewsItem status till failed om alla retries är slut
    if (job.retryCount >= 2) {
      // 3 retries = 0, 1, 2
      try {
        const result = await db.query(
          `
          SELECT extra FROM news_items WHERE db_id = $1
        `,
          [job.newsItemDbId]
        );

        if (result.rows.length > 0) {
          const extra = result.rows[0].extra || {};
          const updatedExtra = {
            ...extra,
            trafficCamera: {
              ...extra.trafficCamera,
              status: 'failed',
              error: errorMessage
            }
          };

          await db.query(
            `
            UPDATE news_items
            SET extra = $1
            WHERE db_id = $2
          `,
            [updatedExtra, job.newsItemDbId]
          );
        }
      } catch (updateError) {
        console.error('Failed to update NewsItem status:', updateError);
      }
    }

    return true; // Continue processing other jobs
  }
}

/**
 * Kör periodisk cleanup av gamla queue-jobs
 */
async function maybeCleanupOldJobs(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    await cleanupOldJobs();
    lastCleanup = now;
  }
}

/**
 * Loggar queue-statistik
 */
async function logQueueStats(): Promise<void> {
  const stats = await getQueueStats();
  console.log(
    `📊 Queue stats: pending=${stats.pending}, processing=${stats.processing}, completed=${stats.completed}, failed=${stats.failed}`
  );
}

/**
 * Worker loop - körs kontinuerligt
 *
 * Startas automatiskt vid server startup (se instrumentation.ts)
 */
export async function startImageUploadWorker(): Promise<void> {
  if (isRunning) {
    console.log('⚠️ Image upload worker already running');
    return;
  }

  isRunning = true;
  console.log('🚀 Starting image upload worker...');

  // Logga initial stats
  await logQueueStats();

  while (isRunning) {
    try {
      const processed = await processImageJob();

      if (!processed) {
        // Inget jobb, vänta innan nästa poll
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      }

      // Cleanup gamla jobs periodiskt
      await maybeCleanupOldJobs();
    } catch (error) {
      console.error('Worker error:', error);
      // Vänta längre vid fel för att undvika tight loop
      await new Promise(resolve => setTimeout(resolve, ERROR_BACKOFF));
    }
  }

  console.log('🛑 Image upload worker stopped');
}

/**
 * Stoppar workern (för graceful shutdown)
 */
export function stopImageUploadWorker(): void {
  console.log('⏸️ Stopping image upload worker...');
  isRunning = false;
}

/**
 * Returnerar om workern körs
 */
export function isWorkerRunning(): boolean {
  return isRunning;
}
