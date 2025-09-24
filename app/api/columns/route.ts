import { NextRequest, NextResponse } from 'next/server'
import { DashboardColumn } from '@/lib/types'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const mainDashboard = await db.getMainDashboard()
    
    return NextResponse.json({
      success: true,
      columns: mainDashboard.columns
    })
  } catch (error) {
    console.error('Error fetching columns:', error)
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
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Column title is required' },
        { status: 400 }
      )
    }

    // Dashboard ID is required
    const dashboardId = body.dashboardId || 'main-dashboard'

    // Generate UUID for the column
    const columnId = crypto.randomUUID()

    const column: DashboardColumn = {
      id: columnId,
      title: body.title.trim(),
      description: body.description?.trim(),
      flowId: body.flowId?.trim() || undefined,
      order: body.order ?? 0,
      createdAt: new Date().toISOString()
    }

    // Add column to specified dashboard
    await db.addColumnToDashboard(dashboardId, column)

    return NextResponse.json({
      success: true,
      message: 'Column created successfully',
      column
    })

  } catch (error) {
    console.error('Error creating column:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}