import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get dashboardId from query params
    const { searchParams } = new URL(request.url)
    const dashboardId = searchParams.get('dashboardId') || 'main-dashboard'

    const archivedColumns = await db.getArchivedColumns(dashboardId)
    
    return NextResponse.json({
      success: true,
      columns: archivedColumns
    })
  } catch (error) {
    console.error('Error fetching archived columns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}