import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dashboard = id === 'main-dashboard' ? await db.getMainDashboard() : await db.getDashboard(id)
    
    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      )
    }
    
    // Update view count and last viewed
    await db.updateDashboard(id, {
      viewCount: (dashboard.viewCount || 0) + 1,
      lastViewed: new Date().toISOString()
    })
    
    // Get data for each column
    const columnData: { [columnId: string]: any[] } = {}
    
    for (const column of dashboard.columns) {
      // Get data from the column-specific storage
      // In the current design, data is stored by column ID, not workflowId
      const columnItems = await db.getColumnData(column.id)
      
      columnData[column.id] = columnItems.slice(0, 20) // Limit to 20 items per column for performance
    }
    
    return NextResponse.json({
      success: true,
      dashboard: await db.getDashboard(id), // Get updated dashboard
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const dashboard = await db.getDashboard(id)
    
    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      )
    }
    
    const updatedDashboard = await db.updateDashboard(id, body)
    
    return NextResponse.json({
      success: true,
      message: 'Dashboard updated successfully',
      dashboard: updatedDashboard
    })
    
  } catch (error) {
    console.error('Error updating dashboard:', error)
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  }
}