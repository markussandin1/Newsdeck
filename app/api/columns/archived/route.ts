import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const archivedColumns = await db.getArchivedColumns('main-dashboard')
    
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