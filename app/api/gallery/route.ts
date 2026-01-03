import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100) // Max 100
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate parameters
    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    const [items, total] = await Promise.all([
      db.getTrafficCameraItems(limit, offset),
      db.getTrafficCameraCount()
    ])

    const hasMore = offset + items.length < total
    const nextOffset = hasMore ? offset + limit : null

    return NextResponse.json(
      {
        success: true,
        items,
        total,
        hasMore,
        nextOffset
      },
      {
        // Private cache to avoid leaking user data via shared caches/CDNs
        headers: {
          'Cache-Control': 'private, max-age=60',
          'Vary': 'Cookie'
        }
      }
    )
  } catch (error) {
    console.error('Error fetching gallery items:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
