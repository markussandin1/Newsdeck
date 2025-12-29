/**
 * Location Cache Admin API
 *
 * POST /api/admin/location-cache - Refresh the in-memory location cache
 *
 * Use this endpoint after adding new location mappings to ensure
 * the cache is up-to-date.
 *
 * TODO: Add authentication check for admin users
 */

import { NextResponse } from 'next/server'
import { locationCache } from '@/lib/services/location-cache'

export async function POST() {
  try {
    console.log('[Admin API] Refreshing location cache...')
    await locationCache.refresh()
    const stats = locationCache.getStats()
    console.log('[Admin API] ✅ Location cache refreshed successfully', stats)

    return NextResponse.json({
      success: true,
      message: 'Location cache refreshed successfully',
      stats
    })
  } catch (error) {
    console.error('[Admin API] ❌ Failed to refresh location cache:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh location cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check cache stats
export async function GET() {
  try {
    const stats = locationCache.getStats()
    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('[Admin API] Failed to get cache stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cache stats'
      },
      { status: 500 }
    )
  }
}
