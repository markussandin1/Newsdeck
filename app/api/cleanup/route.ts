import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const result = await db.cleanupOldItems(7) // Remove items older than 7 days

    return NextResponse.json({
      ...result,
      message: `Cleanup completed. Removed ${result.removedCount} old items`
    })
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json(
      { error: 'Internal server error during cleanup' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Run cleanup and return stats
    const result = await db.cleanupOldItems(7)

    return NextResponse.json({
      ...result,
      message: `Cleanup check completed. Would remove ${result.removedCount} old items`
    })
  } catch (error) {
    console.error('Error during cleanup check:', error)
    return NextResponse.json(
      { error: 'Internal server error during cleanup check' },
      { status: 500 }
    )
  }
}