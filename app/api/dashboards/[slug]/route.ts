import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'
import { NewsItem } from '@/lib/types'
import { auth } from '@/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params
    const slug = params.slug

    const { searchParams } = new URL(request.url)
    const structureOnly = searchParams.get('structureOnly') === 'true'

    let dashboard

    // Handle legacy main dashboard access
    if (slug === 'main' || slug === 'main-dashboard') {
      dashboard = await db.getMainDashboard()
    } else {
      dashboard = await db.getDashboardBySlug(slug)
    }

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      )
    }

    // Fetch column data for all columns in the dashboard
    // Limit to 500 most recent items per column for performance
    // Skipped when structureOnly=true (e.g. initial page load that only needs dashboard structure)
    const COLUMN_ITEM_LIMIT = 500
    const columnData: Record<string, NewsItem[]> = {}

    if (!structureOnly && dashboard.columns) {
      const activeColumns = dashboard.columns.filter((col: { isArchived?: boolean, id: string }) => !col.isArchived)
      const columnIds = activeColumns.map((col: { id: string }) => col.id)
      // Initialize empty arrays for all columns (in case batch fails partially)
      columnIds.forEach((id: string) => { columnData[id] = [] })
      if (columnIds.length > 0) {
        try {
          const batchData = await db.getColumnDataBatch(columnIds, COLUMN_ITEM_LIMIT)
          Object.assign(columnData, batchData)
        } catch (error) {
          logger.error('api.dashboard.columnDataBatchError', { error })
        }
      }
    }
    
    // Bump view_count atomically (fire-and-forget; failures only log).
    // Hoppas över när structureOnly=true — sådana anrop är intern probing
    // (initial page load, stale-check i `/`-redirect) och bör inte räknas
    // som en faktisk dashboard-visning.
    if (!structureOnly) {
      void db.incrementDashboardView(dashboard.id)
    }

    return NextResponse.json({
      success: true,
      dashboard,
      columnData
    })
  } catch (error) {
    logger.error('api.dashboard.getError', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      const session = await auth()
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const params = await context.params
    const slug = params.slug
    const body = await request.json()

    let dashboardId

    // Handle legacy main dashboard access
    if (slug === 'main' || slug === 'main-dashboard') {
      dashboardId = 'main-dashboard'
    } else {
      const dashboard = await db.getDashboardBySlug(slug)
      if (!dashboard) {
        return NextResponse.json(
          { error: 'Dashboard not found' },
          { status: 404 }
        )
      }
      dashboardId = dashboard.id
    }

    const result = await db.updateDashboard(dashboardId, body)

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
    logger.error('api.dashboard.updateError', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      const session = await auth()
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const params = await context.params
    const slug = params.slug

    if (slug === 'main' || slug === 'main-dashboard') {
      return NextResponse.json(
        { error: 'Main dashboard cannot be deleted' },
        { status: 400 }
      )
    }

    const dashboard = await db.getDashboardBySlug(slug)
    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      )
    }

    const ok = await db.deleteDashboard(dashboard.id)
    if (!ok) {
      return NextResponse.json(
        { error: 'Dashboard could not be deleted' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('api.dashboard.deleteError', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
