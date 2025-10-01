import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const columnId = params.id

    // Get dashboardId from query params
    const { searchParams } = new URL(request.url)
    const dashboardId = searchParams.get('dashboardId') || 'main-dashboard'

    const updatedDashboard = await db.removeColumnFromDashboard(dashboardId, columnId)
    
    if (!updatedDashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found or column could not be archived' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Column archived successfully',
      dashboard: updatedDashboard
    })
  } catch (error) {
    console.error('Error archiving column:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}