import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    const columnData: { [columnId: string]: any[] } = {}
    
    if (dashboard.columns) {
      for (const column of dashboard.columns.filter(col => !col.isArchived)) {
        try {
          const items = await db.getColumnData(column.id) || []
          console.log(`🔍 DEBUG - Column ${column.id} (${column.title}) has ${items.length} items`)
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