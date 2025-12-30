import { NextResponse } from 'next/server'
import { locationCache } from '@/lib/services/location-cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = locationCache.getStats()
    const isReady = locationCache.isReady()

    return NextResponse.json({
      success: true,
      cache: {
        isReady,
        loaded: stats.loaded,
        count: stats.count,
        loadedAt: stats.loadedAt,
        version: stats.version,
        sampleVariants: stats.variants
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        cache: {
          isReady: false,
          loaded: false
        }
      },
      { status: 500 }
    )
  }
}
