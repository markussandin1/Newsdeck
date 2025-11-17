import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Require API key authentication for cleanup operations
  if (!verifyApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json().catch(() => ({}))
    const daysToKeep = typeof body.daysToKeep === 'number' ? body.daysToKeep : 2

    logger.info('api.admin.cleanup.start', { daysToKeep })

    const result = await db.cleanupOldItems(daysToKeep)

    logger.info('api.admin.cleanup.success', {
      removedCount: result.removedCount,
      cutoffDate: result.cutoffDate,
      daysToKeep
    })

    return NextResponse.json({
      success: true,
      message: `Cleaned up items older than ${daysToKeep} days`,
      ...result
    })
  } catch (error) {
    logger.error('api.admin.cleanup.error', { error })
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup old items' },
      { status: 500 }
    )
  }
}
