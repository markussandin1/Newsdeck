import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const successFilter = searchParams.get('success')
    const endpoint = searchParams.get('endpoint')

    const filters: { success?: boolean; endpoint?: string } = {}

    if (successFilter === 'true') {
      filters.success = true
    } else if (successFilter === 'false') {
      filters.success = false
    }

    if (endpoint) {
      filters.endpoint = endpoint
    }

    const logs = await db.getApiRequestLogs(limit, filters)

    return NextResponse.json({ success: true, logs })
  } catch (error) {
    logger.error('api.admin.logs.error', { error })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
