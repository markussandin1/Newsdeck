import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const dashboard = await db.getMainDashboard()
    
    // Fetch column data for all columns in the dashboard
    const columnData: { [columnId: string]: any[] } = {}
    
    if (dashboard.columns) {
      for (const column of dashboard.columns) {
        try {
          const items = await db.getColumnData(column.id) || []
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