import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { NewsItem } from '@/lib/types'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params
    const slug = params.slug
    
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
    const COLUMN_ITEM_LIMIT = 500
    const columnData: Record<string, NewsItem[]> = {}

    if (dashboard.columns) {
      for (const column of dashboard.columns.filter((col: { isArchived?: boolean }) => !col.isArchived)) {
        try {
          const items = await db.getColumnData(column.id, COLUMN_ITEM_LIMIT) || []
          columnData[column.id] = items
        } catch (error) {
          console.error(`Error fetching data for column ${column.id}:`, error)
          columnData[column.id] = []
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
