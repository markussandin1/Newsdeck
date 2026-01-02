/**
 * Traffic Camera Refresh API
 *
 * POST /api/traffic-cameras/refresh
 * Body: { newsItemId: string }
 *
 * Triggers a new image capture for a NewsItem with a traffic camera.
 * Rate limited to once per 60 seconds per NewsItem.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db-postgresql';
import { queueImageUpload } from '@/lib/services/image-queue-service';
import { trafficCameraService } from '@/lib/services/traffic-camera-service';

const REFRESH_COOLDOWN = 60; // sekunder

export async function POST(request: NextRequest) {
  try {
    const db = getPool();
    const { newsItemId } = await request.json();

    if (!newsItemId) {
      return NextResponse.json({ error: 'newsItemId required' }, { status: 400 });
    }

    // 1. Hämta NewsItem
    const result = await db.query(
      `
      SELECT db_id, extra FROM news_items WHERE db_id = $1
    `,
      [newsItemId]
    );

    const item = result.rows[0];
    if (!item) {
      return NextResponse.json({ error: 'NewsItem not found' }, { status: 404 });
    }

    const cameraId = item.extra?.trafficCamera?.id;
    if (!cameraId) {
      return NextResponse.json({ error: 'No camera associated with this item' }, { status: 400 });
    }

    // 2. Rate limiting check
    const currentTimestamp = item.extra?.trafficCamera?.currentTimestamp;
    if (currentTimestamp) {
      const secondsSinceRefresh = (Date.now() - new Date(currentTimestamp).getTime()) / 1000;
      if (secondsSinceRefresh < REFRESH_COOLDOWN) {
        return NextResponse.json(
          {
            error: 'Rate limited',
            message: `Vänta ${Math.ceil(REFRESH_COOLDOWN - secondsSinceRefresh)} sekunder innan nästa refresh`,
            retryAfter: Math.ceil(REFRESH_COOLDOWN - secondsSinceRefresh)
          },
          { status: 429 }
        );
      }
    }

    // 3. Hämta ny camera URL från Trafikverket
    const liveData = await trafficCameraService.fetchLiveCameraData(cameraId);
    if (!liveData?.photoUrl) {
      return NextResponse.json(
        { error: 'Failed to fetch camera data from Trafikverket' },
        { status: 503 }
      );
    }

    // 4. Queue uppladdning (asynkront)
    await queueImageUpload(newsItemId, liveData.photoUrl);

    // 5. Uppdatera status till pending
    const updatedExtra = {
      ...item.extra,
      trafficCamera: {
        ...item.extra.trafficCamera,
        status: 'pending'
      }
    };

    await db.query(
      `
      UPDATE news_items SET extra = $1 WHERE db_id = $2
    `,
      [updatedExtra, newsItemId]
    );

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Image refresh queued. Status will update when processing is complete.'
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
