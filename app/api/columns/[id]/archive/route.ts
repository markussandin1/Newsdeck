import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const columnId = params.id
    
    const updatedDashboard = await db.removeColumnFromDashboard('main-dashboard', columnId)
    
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