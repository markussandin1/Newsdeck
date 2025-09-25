import { NextRequest, NextResponse } from 'next/server'

import { ingestNewsItems, IngestionError } from '@/lib/services/ingestion'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch (error) {
    logger.warn('api.workflows.invalidJson', { error })
    return NextResponse.json(
      {
        success: false,
        error: 'Request body must be valid JSON'
      },
      { status: 400 }
    )
  }

  try {
    const result = await ingestNewsItems(body, db)
    logger.info('api.workflows.success', {
      columnId: result.columnId,
      workflowId: result.workflowId,
      itemsAdded: result.itemsAdded,
      columnsUpdated: result.columnsUpdated,
      matchingColumns: result.matchingColumns,
      columnTotals: result.columnTotals
    })
    return NextResponse.json({
      success: true,
      message: 'Workflow payload processed',
      ...result
    })
  } catch (error) {
    if (error instanceof IngestionError) {
      logger.warn('api.workflows.validationError', { error: error.message })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    logger.error('api.workflows.unexpectedError', { error })
    return NextResponse.json(
      { success: false, error: 'Unexpected server error' },
      { status: 500 }
    )
  }
}
