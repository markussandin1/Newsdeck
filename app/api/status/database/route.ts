import { NextResponse } from 'next/server'
import { getDatabaseStatus } from '@/lib/db-config'

export async function GET() {
  try {
    const status = await getDatabaseStatus()
    
    return NextResponse.json({
      success: true,
      database: status
    })
  } catch (error) {
    console.error('Error getting database status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get database status',
        database: {
          connected: false,
          type: 'Unknown',
          status: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}