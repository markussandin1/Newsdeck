import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { NewsItem } from '@/lib/types'

export async function GET() {
  try {
    const dashboard = await db.getMainDashboard()

    // Fetch column data for all columns in the dashboard
    const columnData: Record<string, NewsItem[]> = {}

    if (dashboard.columns) {
      for (const column of dashboard.columns) {
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

    return NextResponse.json({
      success: true,
      dashboard,
      columnData
    })
  } catch (error) {
    console.error('Error fetching main dashboard with column data:', error)
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
    console.error('Error updating main dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
