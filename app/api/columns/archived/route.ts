import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get dashboardId from query params
    const { searchParams } = new URL(request.url)
    const dashboardId = searchParams.get('dashboardId') || 'main-dashboard'

    const archivedColumns = await db.getArchivedColumns(dashboardId)
    
    return NextResponse.json({
      success: true,
      columns: archivedColumns
    })
  } catch (error) {
    logger.error('api.columns.archivedListError', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}