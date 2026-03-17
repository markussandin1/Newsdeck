import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { NewsItem, GeoFilters } from '@/lib/types'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params
    const slug = params.slug

    // Parse query parameters
    const { searchParams } = new URL(request.url)

    // structureOnly=true skips column data computation (used by page.tsx initial load)
    const structureOnly = searchParams.get('structureOnly') === 'true'

    const geoFilters: GeoFilters | undefined = (() => {
      const regionCodes = searchParams.getAll('regionCode')
      const municipalityCodes = searchParams.getAll('municipalityCode')
      const showItemsWithoutLocation = searchParams.get('showItemsWithoutLocation') === 'true'

      // Only create filter object if filters are active
      if (regionCodes.length > 0 || municipalityCodes.length > 0) {
        return { regionCodes, municipalityCodes, showItemsWithoutLocation }
      }
      return undefined
    })()

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
          const batchData = await db.getColumnDataBatch(columnIds, COLUMN_ITEM_LIMIT, geoFilters)
          Object.assign(columnData, batchData)
        } catch (error) {
          console.error('Error fetching column data batch:', error)
        }
      }
    }
    
    // Update last viewed timestamp and view count
    await db.updateDashboard(dashboard.id, {
      lastViewed: new Date().toISOString(),
      viewCount: (dashboard.viewCount || 0) + 1
    })
    
    return NextResponse.json({
      success: true,
      dashboard,
      columnData
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
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
    console.error('Error updating dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
