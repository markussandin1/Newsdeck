import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const result = await db.migrateCreatedInDb()

    return NextResponse.json({
      success: true,
      message: `Migration completed. Updated ${result.updated} items with createdInDb timestamp.`,
      updated: result.updated
    })
  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}