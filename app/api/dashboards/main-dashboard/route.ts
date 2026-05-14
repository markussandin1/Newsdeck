import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'
import { NewsItem } from '@/lib/types'

export async function GET() {
  try {
    const dashboard = await db.getMainDashboard()

    // Fetch column data for all columns in the dashboard
    // Limit to 500 most recent items per column for performance
    const COLUMN_ITEM_LIMIT = 500
    const columnData: Record<string, NewsItem[]> = {}

    if (dashboard.columns) {
      const activeColumns = dashboard.columns.filter((col: { isArchived?: boolean, id: string }) => !col.isArchived)
      const columnIds = activeColumns.map((col: { id: string }) => col.id)
      // Initialize empty arrays for all columns (in case batch fails partially)
      columnIds.forEach((id: string) => { columnData[id] = [] })
      if (columnIds.length > 0) {
        try {
          const batchData = await db.getColumnDataBatch(columnIds, COLUMN_ITEM_LIMIT)
          Object.assign(columnData, batchData)
        } catch (error) {
          logger.error('api.mainDashboard.columnDataBatchError', { error })
        }
      }
    }

    return NextResponse.json({
      success: true,
      dashboard,
      columnData
    })
  } catch (error) {
    logger.error('api.mainDashboard.getError', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = await db.updateDashboard('main-dashboard', body)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update dashboard' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      dashboard: result
    })
  } catch (error) {
    logger.error('api.mainDashboard.updateError', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
