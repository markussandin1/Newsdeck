import { NextRequest, NextResponse } from 'next/server'
import { Dashboard } from '@/lib/types'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const dashboards = await db.getDashboards()
    return NextResponse.json({
      success: true,
      count: dashboards.length,
      dashboards
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
    
    // Basic validation
    if (!body.name) {
      return NextResponse.json(
        { error: 'Dashboard name is required' },
        { status: 400 }
      )
    }
    
    if (!body.columns || !Array.isArray(body.columns)) {
      return NextResponse.json(
        { error: 'Columns array is required' },
        { status: 400 }
      )
    }
    
    // Validate columns
    for (const col of body.columns) {
      if (!col.workflowId) {
        return NextResponse.json(
          { error: 'All columns must have a workflowId' },
          { status: 400 }
        )
      }
    }
    
    const dashboard: Dashboard = {
      id: `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      columns: body.columns,
      createdAt: new Date().toISOString(),
      viewCount: 0
    }
    
    await db.addDashboard(dashboard)
    
    return NextResponse.json({
      success: true,
      message: 'Dashboard created successfully',
      dashboard
    })
    
  } catch (error) {
    console.error('Error creating dashboard:', error)
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  }
}