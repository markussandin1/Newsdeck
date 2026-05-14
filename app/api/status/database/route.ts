import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getDetailedDatabaseHealth } from '@/lib/db-health'

export async function GET() {
  try {
    const status = await getDetailedDatabaseHealth()

    // Provide actionable feedback for developers
    const action = !status.connected && status.proxyRequired && !status.proxyRunning
      ? 'Run: npm run proxy:start'
      : null

    return NextResponse.json({
      success: status.connected,
      database: status,
      action
    })
  } catch (error) {
    logger.error('api.status.database.error', { error })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get database status',
        database: {
          connected: false,
          type: 'Unknown',
          status: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error',
          proxyRequired: false
        },
        action: null
      },
      { status: 500 }
    )
  }
}