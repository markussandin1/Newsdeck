import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    let body = {}
    try {
      body = await request.json()
    } catch {
      // No JSON body provided, use default empty object
      body = {}
    }

    const { columnId } = body as { columnId?: string }

    if (columnId) {
      // Sync specific column
      const result = await db.syncColumnDataFromGeneral(columnId)
      return NextResponse.json({
        message: `Synced column ${columnId}`,
        ...result
      })
    } else {
      // Sync all columns
      const result = await db.syncAllColumnsDataFromGeneral()
      return NextResponse.json({
        message: 'Synced all columns',
        ...result
      })
    }
  } catch (error) {
    console.error('Error syncing columns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}