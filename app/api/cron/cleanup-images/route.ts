/**
 * Image Cleanup Cron Endpoint
 *
 * GET /api/cron/cleanup-images
 *
 * Scheduled to run daily at 03:00 UTC via Google Cloud Scheduler.
 * Performs intelligent cleanup of orphaned traffic camera images.
 *
 * Security: Validates Cloud Scheduler header to prevent unauthorized access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDailyCleanup } from '@/lib/services/image-cleanup-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Verify request comes from Cloud Scheduler
  const authHeader = request.headers.get('X-Cloudscheduler');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('api.cron.cleanupImages.missingSecret');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (!authHeader || authHeader !== cronSecret) {
    logger.warn('api.cron.cleanupImages.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('api.cron.cleanupImages.start');
    await runDailyCleanup();

    return NextResponse.json({
      success: true,
      message: 'Image cleanup completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('api.cron.cleanupImages.error', { error });
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
