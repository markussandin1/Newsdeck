import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const dashboards = await db.getDashboards()
    
    return NextResponse.json({
      success: true,
      count: dashboards.length,
      dashboards: dashboards.map(dashboard => ({
        ...dashboard,
        columnCount: dashboard.columns.filter(col => !col.isArchived).length
      }))
    })
  } catch (error) {
    console.error('Error fetching dashboards:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, columns } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Dashboard name is required' },
        { status: 400 }
      )
    }

    const newDashboard = await db.createDashboard(name.trim(), description?.trim())

    // If columns were provided, add them to the dashboard
    if (columns && Array.isArray(columns) && columns.length > 0) {
      const updatedDashboard = await db.updateDashboard(newDashboard.id, { columns })

      return NextResponse.json({
        success: true,
        message: 'Dashboard created successfully',
        dashboard: updatedDashboard
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard created successfully',
      dashboard: newDashboard
    })

  } catch (error) {
    console.error('Error creating dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
