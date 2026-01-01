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

export async function GET(request: NextRequest) {
  // Verify request comes from Cloud Scheduler
  const authHeader = request.headers.get('X-Cloudscheduler');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (!authHeader || authHeader !== cronSecret) {
    console.warn('Unauthorized cron request attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🕐 Starting scheduled image cleanup...');
    await runDailyCleanup();

    return NextResponse.json({
      success: true,
      message: 'Image cleanup completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cleanup cron job failed:', error);
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
